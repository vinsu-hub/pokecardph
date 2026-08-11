import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { Countdown } from "@/components/auction/Countdown";
import { getCartCount } from "@/lib/cart";
import { php } from "@/lib/utils";

/**
 * Events hub — the ONLY place events are discoverable.
 * Reference: REFERENCE IMAGES/WHO'S THAT POKEMON.png
 *
 * Not in Home/Browse, not in search, not on storefronts. The spec is emphatic,
 * and the reasoning is retention rather than tidiness: the tab becomes its own
 * reason to open the app, separate from shopping intent.
 *
 * Two mechanics live here now, not one: Action Events (bidding-war-style,
 * reusing the Auctions/bids machinery) above Who's That Pokémon (silhouette
 * guessing). They're structurally unrelated — one is a bid table, the other
 * a guess-and-draw — so this page shows both rather than merging them into
 * one abstraction that fits neither.
 */
export const dynamic = "force-dynamic";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "mine" ? "mine" : "all";

  const user = await getSessionUser();
  const cartCount = await getCartCount();

  return (
    <AppShell user={shellUser(user)} cartCount={cartCount}>
      <header className="enter">
        <h1 className="text-display font-bold">Events</h1>
        <p className="mt-1 text-body text-text-secondary">
          Join exciting events, win amazing prizes, and be part of the community!
        </p>
      </header>

      <nav className="enter mt-4 flex gap-1" role="tablist" aria-label="Events">
        {[
          ["all", "All Events"],
          ["mine", "My Entries"],
        ].map(([v, label]) => (
          <Link
            key={v}
            href={`/events?tab=${v}`}
            role="tab"
            aria-selected={tab === v}
            className={`flex h-11 items-center rounded-md px-4 text-body font-medium ${
              tab === v
                ? "border-b-2 border-primary text-primary"
                : "text-text-secondary hover:bg-bg-muted"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === "mine" ? (
        <MyEntries userId={user?.id ?? null} />
      ) : (
        <AllEvents />
      )}
    </AppShell>
  );
}

/* ============================================================================
   All Events — Action Events row, then Who's That Pokémon
   ========================================================================= */

async function AllEvents() {
  const supabase = await createClient();

  const { data: actionEvents } = await supabase
    .from("auctions")
    .select("id, event_title, event_subtitle, status, end_time, max_participants, current_bid, starting_bid, listings(cards(name))")
    .eq("is_action_event", true)
    .in("status", ["scheduled", "live"])
    .order("end_time", { ascending: true })
    .limit(6);

  const events = actionEvents ?? [];
  const counts = new Map<string, number>();
  if (events.length) {
    const { data: watchers } = await supabase
      .from("auction_watchers")
      .select("auction_id")
      .in("auction_id", events.map((e) => e.id));
    for (const w of watchers ?? []) counts.set(w.auction_id, (counts.get(w.auction_id) ?? 0) + 1);
  }

  // `scheduled` rows are invisible to the public by RLS, so "Coming This Week"
  // is built from what a shop is allowed to advertise: that an event exists,
  // never when it goes live.
  const { data: wtpEvents } = await supabase
    .from("pokemon_events")
    .select("*, shops(id, name)")
    .order("created_at", { ascending: false });

  const all = wtpEvents ?? [];
  const live = all.filter((e) => e.status === "live");
  const past = all.filter((e) => ["closed", "winner_selected", "fulfilled"].includes(e.status));

  const { data: teasers } = await supabase.rpc("upcoming_event_shops");

  return (
    <>
      {/* ---- Action Events ---- */}
      <section className="enter enter-d1 mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-h2 font-semibold">
              <span aria-hidden>⚡</span> Action Events
            </h2>
            <p className="mt-0.5 text-caption text-text-secondary">
              Compete, battle, and showcase your skills in thrilling community events.
            </p>
          </div>
          <Link
            href="/events/action"
            className="flex h-11 shrink-0 items-center whitespace-nowrap text-caption font-medium text-primary hover:underline"
          >
            View All Action Events →
          </Link>
        </div>

        <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => {
            const listing = e.listings as unknown as { cards: { name: string } | null } | null;
            const title = e.event_title ?? listing?.cards?.name ?? "Action event";
            const count = counts.get(e.id) ?? 0;
            return (
              <li key={e.id}>
                <Link
                  href={`/auctions/${e.id}`}
                  className="group flex flex-col overflow-hidden rounded-lg border border-border bg-bg shadow-rest transition-[transform,box-shadow] duration-(--duration-fast) ease-(--ease-out-soft) hover:-translate-y-0.5 hover:shadow-elevated"
                >
                  <div className="relative flex aspect-[16/9] flex-col justify-end overflow-hidden bg-[#10131c] p-3">
                    <span
                      className={`absolute top-2 left-2 rounded-md px-2 py-0.5 text-caption font-medium ${
                        e.status === "live" ? "bg-danger text-white" : "bg-white/15 text-white"
                      }`}
                    >
                      {e.status === "live" ? "LIVE NOW" : "REGISTRATION OPEN"}
                    </span>
                    <p className="truncate text-body font-semibold text-white">{title}</p>
                    {e.event_subtitle && (
                      <p className="truncate text-caption text-white/70">{e.event_subtitle}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 p-3">
                    <p className="text-body font-bold tabular">
                      {php(Number(e.current_bid ?? e.starting_bid))}
                    </p>
                    <p className="text-caption text-text-secondary">
                      <span className="tabular">{count}</span>
                      {e.max_participants != null ? `/${e.max_participants}` : ""} players ·{" "}
                      <Countdown endsAt={e.end_time} />
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}

          {/* Tournament / League — no mechanic specified anywhere (no bracket
              system, no PvP engine), so these are inert teasers, never a real
              route. Same stub-with-reason treatment as every other unspecced
              mockup feature in this project. */}
          {[
            ["🏆", "Tournament", "Coming in a future release"],
            ["🎖", "League", "Coming in a future release"],
          ].map(([icon, label, note]) => (
            <li key={label as string}>
              <div
                title="Coming soon — no format has been specified yet"
                className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-bg-muted p-6 text-center"
              >
                <span aria-hidden className="text-h2 opacity-50">{icon}</span>
                <p className="text-body font-medium text-text-muted">{label}</p>
                <p className="text-caption text-text-muted">{note}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Who's That Pokémon? ---- */}
      <section className="enter enter-d2 mt-10">
        <h2 className="flex items-center gap-2 text-h2 font-semibold" style={{ fontFamily: "var(--font-pokemon)" }}>
          Who&apos;s That Pokémon?
        </h2>
        <p className="mt-0.5 text-caption text-text-secondary">
          Guess the silhouette, win the gift. One winner drawn at random from
          everyone who gets it right — not whoever answers first.
        </p>

        {/* ---- Live Now ---- */}
        <div className="mt-6">
          <h3 className="text-h3 font-semibold">Live Now</h3>
          {live.length === 0 ? (
            <p className="mt-3 rounded-lg border border-border bg-bg px-6 py-10 text-center text-body text-text-secondary">
              Nothing live right now. Check back — events start at a random time.
            </p>
          ) : (
            <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {live.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/events/${e.id}`}
                    className="group flex flex-col overflow-hidden rounded-lg border border-border bg-bg shadow-rest transition-[transform,box-shadow] duration-(--duration-fast) ease-(--ease-out-soft) hover:-translate-y-0.5 hover:shadow-elevated"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#1a1d29]">
                      <div className="absolute inset-0 grid place-items-center blur-[6px]">
                        <Blob name={e.gift_name} />
                      </div>
                      <span className="absolute top-2 left-2 rounded-md bg-danger px-2 py-0.5 text-caption font-medium text-white">
                        Live
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 p-3">
                      <p className="truncate text-body font-medium">{e.shops?.name}</p>
                      <p className="text-caption text-text-secondary">
                        Ends in <Countdown endsAt={e.ends_at} />
                      </p>
                      <GuessCount eventId={e.id} />
                      <span className="mt-2 flex h-11 items-center justify-center rounded-md bg-primary text-body font-medium text-white">
                        Guess Now
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---- Coming This Week ---- */}
        <div className="mt-6">
          <h3 className="text-h3 font-semibold">Coming This Week</h3>
          {(teasers ?? []).length === 0 ? (
            <p className="mt-3 text-body text-text-secondary">
              No events scheduled this week yet.
            </p>
          ) : (
            <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(teasers as { shop_id: string; shop_name: string }[]).map((t) => (
                <li
                  key={t.shop_id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg p-4"
                >
                  <p className="min-w-0 text-body">
                    An event is coming from{" "}
                    <span className="font-medium">{t.shop_name}</span> this week 👀
                  </p>
                  <span aria-hidden className="bell-idle shrink-0 text-h3">🔔</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-caption text-text-muted">
            Start times are randomised inside each vendor&apos;s chosen window —
            nobody knows the exact minute, including us until it happens.
          </p>
        </div>

        {/* ---- Past Winners ---- */}
        <div className="mt-6">
          <h3 className="text-h3 font-semibold">Past Winners</h3>
          {past.length === 0 ? (
            <p className="mt-3 text-body text-text-secondary">No events have closed yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {past.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/events/${e.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg p-4 hover:bg-bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-body font-medium capitalize">{e.correct_answer}</p>
                      <p className="truncate text-caption text-text-secondary">
                        {e.gift_name} · {e.shops?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <WinnerLabel winnerId={e.winner_id} eventId={e.id} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

/* ============================================================================
   My Entries — union of Who's That Pokémon guesses and joined Action Events
   ========================================================================= */

async function MyEntries({ userId }: { userId: string | null }) {
  if (!userId) {
    return (
      <p className="enter mt-8 rounded-lg border border-border bg-bg px-6 py-10 text-center text-body text-text-secondary">
        <Link href="/login?next=/events?tab=mine" className="font-medium text-primary hover:underline">
          Sign in
        </Link>{" "}
        to see the events you&apos;ve entered.
      </p>
    );
  }

  const supabase = await createClient();

  const { data: guesses } = await supabase
    .from("event_guesses")
    .select("id, is_correct, created_at, pokemon_events(id, gift_name, status, correct_answer)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const { data: joined } = await supabase
    .from("auction_watchers")
    .select("created_at, auctions(id, event_title, status, end_time, is_action_event, listings(cards(name)))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const joinedEvents = (joined ?? []).filter(
    (j) => (j.auctions as unknown as { is_action_event: boolean } | null)?.is_action_event,
  );

  const empty = (guesses?.length ?? 0) === 0 && joinedEvents.length === 0;

  if (empty) {
    return (
      <p className="enter mt-8 rounded-lg border border-border bg-bg px-6 py-10 text-center text-body text-text-secondary">
        No entries yet — join an Action Event or guess on a live silhouette to see it here.
      </p>
    );
  }

  return (
    <div className="enter mt-8 flex flex-col gap-2">
      {joinedEvents.map((j) => {
        const a = j.auctions as unknown as {
          id: string; event_title: string | null; status: string; end_time: string;
          listings: { cards: { name: string } | null } | null;
        };
        return (
          <Link
            key={`action-${a.id}`}
            href={`/auctions/${a.id}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg p-4 hover:bg-bg-muted"
          >
            <div className="min-w-0">
              <p className="truncate text-body font-medium">
                {a.event_title ?? a.listings?.cards?.name ?? "Action event"}
              </p>
              <p className="text-caption text-text-secondary">Action Event · Joined</p>
            </div>
            <span className="shrink-0 text-caption text-text-secondary capitalize">{a.status}</span>
          </Link>
        );
      })}

      {(guesses ?? []).map((g) => {
        const e = g.pokemon_events as unknown as {
          id: string; gift_name: string; status: string; correct_answer: string;
        } | null;
        if (!e) return null;
        return (
          <Link
            key={`guess-${g.id}`}
            href={`/events/${e.id}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg p-4 hover:bg-bg-muted"
          >
            <div className="min-w-0">
              <p className="truncate text-body font-medium">{e.gift_name}</p>
              <p className="text-caption text-text-secondary">Who&apos;s That Pokémon? · Guess submitted</p>
            </div>
            <span className="shrink-0 text-caption text-text-secondary capitalize">{e.status}</span>
          </Link>
        );
      })}
    </div>
  );
}

/* ============================================================================ */

/** Aggregate only — never who guessed what. */
async function GuessCount({ eventId }: { eventId: string }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("event_guess_count", { p_event_id: eventId });
  return (
    <p className="text-caption text-text-secondary">
      <span className="tabular">{Number(data ?? 0)}</span> people have guessed
    </p>
  );
}

/** Masked, like auction bidders — social proof without exposing anyone. */
async function WinnerLabel({
  winnerId,
  eventId,
}: {
  winnerId: string | null;
  eventId: string;
}) {
  const supabase = await createClient();
  const { data: correct } = await supabase.rpc("event_correct_count", {
    p_event_id: eventId,
  });
  return (
    <>
      <p className="text-body font-medium">
        {winnerId ? `Won by ****${winnerId.slice(-2)}` : "No winner"}
      </p>
      <p className="text-caption text-text-secondary">
        <span className="tabular">{Number(correct ?? 0)}</span> guessed correctly
      </p>
    </>
  );
}

function Blob({ name }: { name: string }) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return (
    <span
      className="block size-1/2 rounded-full"
      style={{ background: `hsl(${h} 50% 25%)` }}
    />
  );
}
