import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { BiddingPanel } from "@/components/auction/BiddingPanel";
import { JoinEventButton } from "@/components/auction/JoinEventButton";
import { Countdown } from "@/components/auction/Countdown";
import { php } from "@/lib/utils";

/** Auction detail. Image panel reuses Card Detail's layout; 2D only. */
export const dynamic = "force-dynamic";

export default async function AuctionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getSessionUser();

  const { data: auction } = await supabase
    .from("auctions")
    .select("*, listings(*, cards(*), shops(*))")
    .eq("id", id)
    .maybeSingle();
  if (!auction) notFound();

  const listing = auction.listings as {
    id: string; shop_id: string; description: string | null; item_category: string;
    cards: { name: string; set_name: string; rarity: string | null } | null;
    shops: { id: string; name: string; rating: number; review_count: number };
  };

  // Public history — masked identities, no proxy maximums. Served by the
  // public_bid_history view, never by reading `bids` directly.
  const { data: history } = await supabase
    .from("public_bid_history")
    .select("*")
    .eq("auction_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  const title = listing?.cards?.name ?? listing?.description?.split("\n")[0] ?? "Auction item";
  const isVendorOwn = user?.shopId != null && listing.shop_id === user.shopId;
  const reserveMet =
    auction.reserve_price == null ||
    Number(auction.current_bid ?? 0) >= Number(auction.reserve_price);

  // Participants panel — only fetched for action events, since regular
  // auctions don't have a join step or a cap to check against.
  let participantCount = 0;
  let hasJoined = false;
  if (auction.is_action_event) {
    const { count } = await supabase
      .from("auction_watchers")
      .select("*", { count: "exact", head: true })
      .eq("auction_id", id);
    participantCount = count ?? 0;

    if (user) {
      const { data: mine } = await supabase
        .from("auction_watchers")
        .select("auction_id")
        .eq("auction_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      hasJoined = mine != null;
    }
  }
  const isFull =
    auction.max_participants != null && participantCount >= auction.max_participants;

  return (
    <AppShell user={shellUser(user)}>
      {auction.is_action_event && (
        <nav className="mb-4 text-caption text-text-secondary">
          <Link href="/events" className="hover:text-text-primary">Events</Link>
          <span className="mx-1.5">›</span>
          <Link href="/events/action" className="hover:text-text-primary">Action Events</Link>
          <span className="mx-1.5">›</span>
          <span className="text-text-primary">{auction.event_title ?? title}</span>
        </nav>
      )}

      {auction.is_action_event && (
        <section className="mb-6 overflow-hidden rounded-lg border border-border">
          <div className="relative bg-[#10131c] px-6 py-8 text-white">
            <span
              className={`inline-flex h-7 items-center rounded-md px-2.5 text-caption font-medium ${
                auction.status === "live" ? "bg-danger text-white" : "bg-white/15 text-white"
              }`}
            >
              {auction.status === "live" ? "LIVE NOW" : "REGISTRATION OPEN"}
            </span>
            <h1 className="mt-3 text-display font-bold">
              {auction.event_title ?? title}
            </h1>
            {auction.event_subtitle && (
              <p className="mt-1 text-h3 text-white/80">{auction.event_subtitle}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-caption text-white/70">
              <span>
                {participantCount}
                {auction.max_participants != null ? ` / ${auction.max_participants}` : ""} Players
              </span>
              <span>
                Ends in <Countdown endsAt={auction.end_time} className="text-white" />
              </span>
              {auction.prize_description && <span>{auction.prize_description}</span>}
            </div>
          </div>

          <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-4">
            {[
              ["⚡", "Bidding War", "Outbid other players in real-time."],
              ["🛡️", "Live & Fair", "All bids are final and transparent."],
              ["🏆", "No Reserve", "Highest bidder at the end wins."],
              ["🔒", "Secure Payment", "Winners pay securely after the event."],
            ].map(([icon, t, d]) => (
              <div key={t as string} className="flex items-start gap-2">
                <span aria-hidden className="text-h3">{icon}</span>
                <div>
                  <p className="text-body font-medium">{t}</p>
                  <p className="text-caption text-text-secondary">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border">
            <Art name={title} />
          </div>

          <section className="mt-6 rounded-lg border border-border bg-bg p-(--card-pad)">
            <h1 className="text-h2 font-semibold">{title}</h1>
            {listing?.cards && (
              <p className="mt-1 text-body text-text-secondary">
                {[listing.cards.rarity, listing.cards.set_name].filter(Boolean).join(" · ")}
              </p>
            )}
            <p className="mt-3 text-body text-text-secondary">
              {listing?.description ?? "No description provided."}
            </p>
            <p className="mt-3 text-caption text-text-secondary">
              Sold by <span className="font-medium text-text-primary">{listing?.shops?.name}</span>{" "}
              · ★ {listing?.shops?.rating} ({listing?.shops?.review_count})
            </p>
          </section>

          <section className="mt-4 rounded-lg border border-border bg-bg p-(--card-pad)">
            <h2 className="text-h3 font-semibold">Bid history</h2>
            {(history?.length ?? 0) === 0 ? (
              <p className="mt-2 text-body text-text-secondary">No bids yet — be the first.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {history!.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0">
                    <span className="text-body">
                      {b.masked_bidder}
                      {b.is_auto_bid && (
                        <span className="ml-2 text-caption text-text-muted">auto</span>
                      )}
                    </span>
                    <span className="text-body font-bold tabular">{php(Number(b.amount))}</span>
                    <time className="shrink-0 text-caption text-text-secondary tabular">
                      {new Date(b.created_at).toLocaleString("en-PH", {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {auction.is_action_event && (
            <section className="mt-4 rounded-lg border border-border bg-bg p-(--card-pad)">
              <h2 className="text-h3 font-semibold">How It Works</h2>
              <ol className="mt-3 grid gap-4 sm:grid-cols-4">
                {[
                  ["Join the event", "Enter the auction before it starts."],
                  ["Place your bids", "Bid higher than the current highest bid."],
                  ["Stay until the end", "Outbid others before time runs out."],
                  ["Highest bid wins", "Win the card and complete payment."],
                ].map(([t, d], i) => (
                  <li key={t as string}>
                    <span className="grid size-7 place-items-center rounded-full bg-primary text-caption font-medium text-white">
                      {i + 1}
                    </span>
                    <p className="mt-2 text-body font-medium">{t}</p>
                    <p className="text-caption text-text-secondary">{d}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {auction.is_action_event && (
            <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
              <div className="flex items-center justify-between">
                <h2 className="text-h3 font-semibold">
                  Participants ({participantCount}
                  {auction.max_participants != null ? `/${auction.max_participants}` : ""})
                </h2>
              </div>
              <div className="mt-3">
                <JoinEventButton
                  auctionId={auction.id}
                  alreadyJoined={hasJoined}
                  signedIn={user != null}
                  full={isFull && !hasJoined}
                />
              </div>
            </section>
          )}

          <BiddingPanel
            auction={{
              id: auction.id,
              starting_bid: Number(auction.starting_bid),
              bid_increment: Number(auction.bid_increment),
              current_bid: auction.current_bid == null ? null : Number(auction.current_bid),
              bid_count: auction.bid_count,
              end_time: auction.end_time,
              status: auction.status,
              buy_it_now_price:
                auction.buy_it_now_price == null ? null : Number(auction.buy_it_now_price),
              reserve_price: auction.reserve_price == null ? null : Number(auction.reserve_price),
            }}
            isVendorOwn={isVendorOwn}
            signedIn={user != null}
            reserveMet={reserveMet}
          />
        </div>
      </div>
    </AppShell>
  );
}

function Art({ name }: { name: string }) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return (
    <div
      className="absolute inset-0 grid place-items-center p-6 text-center"
      style={{
        background: `linear-gradient(150deg, hsl(${h} 70% 88%), hsl(${(h + 40) % 360} 65% 78%))`,
      }}
    >
      <span className="text-h2 font-semibold text-text-primary/50">{name}</span>
    </div>
  );
}
