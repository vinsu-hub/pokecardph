import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { BiddingPanel } from "@/components/auction/BiddingPanel";
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

  return (
    <AppShell user={shellUser(user)}>
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
        </div>

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
