import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { FilterSheet } from "@/components/shared/FilterSheet";
import { ListingCardTile } from "@/components/buyer/ListingCardTile";
import type { ListingCard } from "@/lib/supabase/types";

/**
 * Home / Browse.
 * Reference: REFERENCE IMAGES/SHOP PAGE.png — despite the filename, that image
 * is this screen, not the shop storefront.
 *
 * Horizontal filter bar (not the left sidebar used by Search results), result
 * count, card grid, pagination.
 */

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type Search = { page?: string; type?: string; sort?: string };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const type = sp.type ?? "all";
  const sort = sp.sort ?? "newest";

  const supabase = await createClient();
  const user = await getSessionUser();

  let query = supabase
    .from("listings")
    .select("*, cards(*), shops(*)", { count: "exact" })
    .eq("status", "active");

  if (type === "graded") query = query.eq("listing_type", "graded");
  if (type === "non_graded") query = query.eq("listing_type", "non_graded");

  query =
    sort === "price_asc"
      ? query.order("price", { ascending: true })
      : sort === "price_desc"
        ? query.order("price", { ascending: false })
        : query.order("created_at", { ascending: false });

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);

  const listings = (data ?? []) as unknown as ListingCard[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppShell user={shellUser(user)}>
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-display font-bold">Pokémon Cards for Sale</h1>
          <p className="mt-1 text-body text-text-secondary">
            Buy from verified Filipino collectors and vendors.
          </p>
        </header>

        {/* Filter bar — horizontal on this screen, per the reference. Collapses
            into the shared FilterSheet below 1024px. */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg p-3">
          <TypeTabs active={type} sort={sort} />
          <div className="ml-auto flex items-center gap-2">
            <SortLinks active={sort} type={type} />
            <FilterSheet mobileOnly activeCount={type === "all" ? 0 : 1}>
              <div className="rounded-lg border border-border bg-bg p-(--card-pad)">
                <h3 className="text-h3 font-semibold">Card type</h3>
                <ul className="mt-2 flex flex-col">
                  {TYPES.map((t) => (
                    <li key={t.value}>
                      <a
                        href={`/?type=${t.value}&sort=${sort}`}
                        className="flex h-11 items-center text-body"
                      >
                        {t.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </FilterSheet>
          </div>
        </div>

        {error ? (
          <p className="rounded-lg border border-danger-bg bg-danger-bg px-4 py-3 text-body text-danger">
            Couldn&apos;t load listings: {error.message}
          </p>
        ) : (
          <>
            <p className="text-body text-text-secondary">
              <span className="font-medium text-text-primary tabular">
                {total.toLocaleString("en-PH")}
              </span>{" "}
              listing{total === 1 ? "" : "s"} found
            </p>

            {listings.length === 0 ? (
              <p className="rounded-lg border border-border bg-bg px-6 py-12 text-center text-body text-text-secondary">
                No listings match these filters yet.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {listings.map((l) => (
                  <li key={l.id}>
                    <ListingCardTile listing={l} />
                  </li>
                ))}
              </ul>
            )}

            {pages > 1 && (
              <nav className="flex items-center justify-center gap-1 pt-2">
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <a
                    key={p}
                    href={`/?page=${p}&type=${type}&sort=${sort}`}
                    aria-current={p === page ? "page" : undefined}
                    className={`grid h-11 min-w-11 place-items-center rounded-md px-3 text-body font-medium tabular ${
                      p === page
                        ? "bg-primary text-white"
                        : "border border-border bg-bg text-text-secondary hover:bg-bg-muted"
                    }`}
                  >
                    {p}
                  </a>
                ))}
              </nav>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

const TYPES = [
  { value: "all", label: "All Cards" },
  { value: "graded", label: "Graded" },
  { value: "non_graded", label: "Non-Graded" },
];

function TypeTabs({ active, sort }: { active: string; sort: string }) {
  return (
    <div className="flex flex-wrap gap-1">
      {TYPES.map((t) => (
        <a
          key={t.value}
          href={`/?type=${t.value}&sort=${sort}`}
          className={`flex h-11 items-center rounded-md px-4 text-body font-medium transition-colors duration-(--duration-instant) ${
            active === t.value
              ? "bg-primary-subtle text-primary"
              : "border border-border bg-bg text-text-secondary hover:bg-bg-muted"
          }`}
        >
          {t.label}
        </a>
      ))}
    </div>
  );
}

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
];

function SortLinks({ active, type }: { active: string; type: string }) {
  return (
    <div className="hidden gap-1 sm:flex">
      {SORTS.map((s) => (
        <a
          key={s.value}
          href={`/?type=${type}&sort=${s.value}`}
          className={`flex h-11 items-center rounded-md px-3 text-body transition-colors duration-(--duration-instant) ${
            active === s.value
              ? "bg-primary-subtle font-medium text-primary"
              : "text-text-secondary hover:bg-bg-muted"
          }`}
        >
          {s.label}
        </a>
      ))}
    </div>
  );
}
