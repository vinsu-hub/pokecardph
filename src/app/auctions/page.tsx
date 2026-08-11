import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { Countdown } from "@/components/auction/Countdown";
import { php } from "@/lib/utils";

/**
 * Auctions browse.
 *
 * No reference image exists for this screen — built to spec in the established
 * visual language. Cards show CURRENT bid, not starting bid, plus bid count,
 * a live countdown, and a category badge in place of the condition badge.
 */
export const dynamic = "force-dynamic";

const CATEGORY: Record<string, string> = {
  card: "Card",
  sealed_pack: "Sealed Pack",
  sealed_box: "Sealed Box",
  merch: "Merch",
  signed_item: "Signed Item",
};

export default async function AuctionsPage({
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
    .select("*, listings(id, description, item_category, cards(name, set_name), shops(name))")
    .in("status", ["scheduled", "live"]);

  q =
    sort === "bids"
      ? q.order("bid_count", { ascending: false })
      : sort === "newest"
        ? q.order("created_at", { ascending: false })
        : q.order("end_time", { ascending: true });

  const { data } = await q;
  const auctions = data ?? [];

  return (
    <AppShell user={shellUser(user)}>
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-display font-bold">Live Auctions</h1>
          <p className="mt-1 text-body text-text-secondary">
            Rare cards, sealed product, and signed items — bid before the clock runs out.
          </p>
        </header>

        <div className="flex flex-wrap gap-1">
          {[
            ["ending", "Ending Soon"],
            ["bids", "Most Bids"],
            ["newest", "Newest"],
          ].map(([v, label]) => (
            <Link
              key={v}
              href={`/auctions?sort=${v}`}
              className={`flex h-11 items-center rounded-md px-4 text-body font-medium ${
                sort === v
                  ? "bg-primary-subtle text-primary"
                  : "border border-border bg-bg text-text-secondary hover:bg-bg-muted"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {auctions.length === 0 ? (
          <p className="rounded-lg border border-border bg-bg px-6 py-12 text-center text-body text-text-secondary">
            No auctions running right now.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {auctions.map((a) => {
              const l = a.listings as {
                id: string;
                description: string | null;
                item_category: string;
                cards: { name: string; set_name: string } | null;
                shops: { name: string };
              };
              const title = l?.cards?.name ?? l?.description?.split("\n")[0] ?? "Auction item";
              return (
                <li key={a.id}>
                  <Link
                    href={`/auctions/${a.id}`}
                    className="group flex flex-col overflow-hidden rounded-lg border border-border bg-bg shadow-rest transition-[transform,box-shadow] duration-(--duration-fast) ease-(--ease-out-soft) hover:-translate-y-0.5 hover:shadow-elevated"
                  >
                    <div className="relative aspect-[3/4] bg-bg-muted">
                      <span className="absolute top-2 left-2 z-10 rounded-md bg-primary px-2 py-0.5 text-caption font-medium text-white">
                        {CATEGORY[l?.item_category] ?? "Item"}
                      </span>
                      <Art name={title} />
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5 p-3">
                      <h2 className="truncate text-body font-medium">{title}</h2>
                      <p className="truncate text-caption text-text-secondary">
                        {l?.shops?.name}
                      </p>
                      <p className="mt-1 text-body font-bold tabular">
                        {php(Number(a.current_bid ?? a.starting_bid))}
                      </p>
                      <p className="text-caption text-text-secondary">
                        <span className="tabular">{a.bid_count}</span> bids ·{" "}
                        <Countdown endsAt={a.end_time} />
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
      className="absolute inset-0 grid place-items-center p-3 text-center"
      style={{
        background: `linear-gradient(150deg, hsl(${h} 70% 88%), hsl(${(h + 40) % 360} 65% 78%))`,
      }}
    >
      <span className="text-caption font-medium text-text-primary/60">{name}</span>
    </div>
  );
}
