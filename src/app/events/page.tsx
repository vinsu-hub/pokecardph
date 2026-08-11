import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { Countdown } from "@/components/auction/Countdown";
import { getCartCount } from "@/lib/cart";

/**
 * Events tab — the ONLY place events are discoverable.
 *
 * Not in Home/Browse, not in search, not on storefronts. The spec is emphatic,
 * and the reasoning is retention rather than tidiness: the tab becomes its own
 * reason to open the app, separate from shopping intent. Folding events into
 * the main grid would turn them into another merchandising surface.
 *
 * Three panels: Live Now · Coming This Week · Past Winners.
 */
export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const supabase = await createClient();
  const user = await getSessionUser();
  const cartCount = await getCartCount();

  // `scheduled` rows are invisible to the public by RLS, so "Coming This Week"
  // is built from what a shop is allowed to advertise: that an event exists,
  // never when it goes live.
  const { data: events } = await supabase
    .from("pokemon_events")
    .select("*, shops(id, name)")
    .order("created_at", { ascending: false });

  const all = events ?? [];
  const live = all.filter((e) => e.status === "live");
  const past = all.filter((e) =>
    ["closed", "winner_selected", "fulfilled"].includes(e.status),
  );

  // Shops with an event this week that hasn't gone live yet. Visible only as
  // "something is coming" — no silhouette, no time.
  const { data: teasers } = await supabase.rpc("upcoming_event_shops");

  return (
    <AppShell user={shellUser(user)} cartCount={cartCount}>
      <header className="enter">
        <h1 className="text-display font-bold">Events</h1>
        <p className="mt-1 text-body text-text-secondary">
          Guess the silhouette, win the gift. One winner drawn at random from
          everyone who gets it right — not whoever answers first.
        </p>
      </header>

      {/* ---- Live Now ---- */}
      <section className="enter enter-d1 mt-8">
        <h2 className="text-h2 font-semibold">Live Now</h2>
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
                  {/* Teased, not shown in full — the puzzle lives on the
                      detail page. */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#1a1d29]">
                    <div className="absolute inset-0 grid place-items-center blur-[6px]">
                      <Blob name={e.gift_name} />
                    </div>
                    <span className="absolute top-2 left-2 rounded-md bg-danger px-2 py-0.5 text-caption font-medium text-white">
                      Live
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 p-3">
                    <p className="truncate text-body font-medium">
                      {e.shops?.name}
                    </p>
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
      </section>

      {/* ---- Coming This Week ---- */}
      <section className="enter enter-d2 mt-8">
        <h2 className="text-h2 font-semibold">Coming This Week</h2>
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
                {/* The only looping ambient animation in the feature. */}
                <span aria-hidden className="bell-idle shrink-0 text-h3">🔔</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-caption text-text-muted">
          Start times are randomised inside each vendor&apos;s chosen window —
          nobody knows the exact minute, including us until it happens.
        </p>
      </section>

      {/* ---- Past Winners ---- */}
      <section className="enter enter-d3 mt-8">
        <h2 className="text-h2 font-semibold">Past Winners</h2>
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
                    <p className="truncate text-body font-medium capitalize">
                      {e.correct_answer}
                    </p>
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
      </section>
    </AppShell>
  );
}

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
