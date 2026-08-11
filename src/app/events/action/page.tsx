import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { Countdown } from "@/components/auction/Countdown";
import { php } from "@/lib/utils";

/**
 * Action Events browse — the "View All Action Events →" destination from the
 * Events hub. Mirrors Auctions Browse (src/app/auctions/page.tsx) rather than
 * forking its structure: same query shape, same card grid, filtered to
 * is_action_event = true, with a player-count badge and LIVE/upcoming status
 * in place of the item-category badge, since that's what actually
 * distinguishes one event card from another here.
 */
export const dynamic = "force-dynamic";

export default async function ActionEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const sp = await searchParams;
  const sort = sp.sort ?? "ending";
  const supabase = await createClient();
  const user = await getSessionUser();

  let q = supabase
    .from("auctions")
    .select(
      "*, listings(id, description, item_category, cards(name, set_name), shops(name))",
    )
    .eq("is_action_event", true)
    .in("status", ["scheduled", "live"]);

  q =
    sort === "players"
      ? q.order("max_participants", { ascending: false })
      : sort === "newest"
        ? q.order("created_at", { ascending: false })
        : q.order("end_time", { ascending: true });

  const { data } = await q;
  const events = data ?? [];

  // Participant counts, one query for all events on the page rather than N+1.
  const counts = new Map<string, number>();
  if (events.length) {
    const { data: watchers } = await supabase
      .from("auction_watchers")
      .select("auction_id")
      .in("auction_id", events.map((e) => e.id));
    for (const w of watchers ?? []) {
      counts.set(w.auction_id, (counts.get(w.auction_id) ?? 0) + 1);
    }
  }

  return (
    <AppShell user={shellUser(user)}>
      <nav className="mb-4 text-caption text-text-secondary">
        <Link href="/events" className="hover:text-text-primary">Events</Link>
        <span className="mx-1.5">›</span>
        <span className="text-text-primary">Action Events</span>
      </nav>

      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-display font-bold">Action Events</h1>
          <p className="mt-1 text-body text-text-secondary">
            Compete, battle, and showcase your skills in thrilling community events.
          </p>
        </header>

        <div className="flex flex-wrap gap-1">
          {[
            ["ending", "Ending Soon"],
            ["players", "Most Players"],
            ["newest", "Newest"],
          ].map(([v, label]) => (
            <Link
              key={v}
              href={`/events/action?sort=${v}`}
              className={`flex h-11 items-center rounded-md px-4 text-body font-medium ${
                sort === v
                  ? "bg-primary-subtle text-primary-on-subtle"
                  : "border border-border bg-bg text-text-secondary hover:bg-bg-muted"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {events.length === 0 ? (
          <p className="rounded-lg border border-border bg-bg px-6 py-12 text-center text-body text-text-secondary">
            No action events running right now — check back soon.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {events.map((e) => {
              const l = e.listings as {
                description: string | null;
                cards: { name: string; set_name: string } | null;
                shops: { name: string };
              };
              const title = e.event_title ?? l?.cards?.name ?? l?.description?.split("\n")[0] ?? "Action event";
              const count = counts.get(e.id) ?? 0;
              return (
                <li key={e.id}>
                  <Link
                    href={`/auctions/${e.id}`}
                    className="group flex flex-col overflow-hidden rounded-lg border border-border bg-bg shadow-rest transition-[transform,box-shadow] duration-(--duration-fast) ease-(--ease-out-soft) hover:-translate-y-0.5 hover:shadow-elevated"
                  >
                    <div className="relative aspect-[3/4] bg-[#10131c]">
                      <span
                        className={`absolute top-2 left-2 z-10 rounded-md px-2 py-0.5 text-caption font-medium ${
                          e.status === "live" ? "bg-danger text-white" : "bg-white/15 text-white"
                        }`}
                      >
                        {e.status === "live" ? "LIVE NOW" : "REGISTRATION OPEN"}
                      </span>
                      <Art name={title} />
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5 p-3">
                      <h2 className="truncate text-body font-medium">{title}</h2>
                      {e.event_subtitle && (
                        <p className="truncate text-caption text-text-secondary">{e.event_subtitle}</p>
                      )}
                      <p className="mt-1 text-body font-bold tabular">
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
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function Art({ name }: { name: string }) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return (
    <div
      className="absolute inset-0 grid place-items-center p-3 text-center opacity-70"
      style={{
        background: `linear-gradient(150deg, hsl(${h} 60% 25%), hsl(${(h + 40) % 360} 55% 15%))`,
      }}
    >
      <span className="text-caption font-medium text-white/70">{name}</span>
    </div>
  );
}
