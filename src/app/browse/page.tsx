import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { FilterSheet } from "@/components/shared/FilterSheet";
import {
  ListingResults,
  ViewToggle,
  FilterSelect,
} from "@/components/buyer/ListingResults";
import { getCartCount } from "@/lib/cart";
import { conditionLabel, type ListingCard } from "@/lib/supabase/types";

/**
 * Home / Browse.
 * Reference: REFERENCE IMAGES/SHOP PAGE.png — despite the filename, that image
 * is this screen, not the shop storefront.
 *
 * Lives at /browse, not the domain root — the root now shows the marketing
 * landing page to signed-out visitors and redirects a signed-in session
 * straight here. Every "Home" nav link and breadcrumb across the app points
 * at this route.
 *
 * Horizontal filter bar (Search results uses a left sidebar instead — the two
 * reference screens are deliberately different), result count, card grid with
 * a grid/list toggle, pagination.
 */
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type Search = {
  page?: string; type?: string; sort?: string; view?: string;
  set?: string; condition?: string; price?: string; seller?: string;
};

const PRICE_BANDS: Record<string, [number, number]> = {
  "0-1000": [0, 1000],
  "1000-2500": [1000, 2500],
  "2500-5000": [2500, 5000],
  "5000+": [5000, Number.MAX_SAFE_INTEGER],
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const type = sp.type ?? "all";
  const sort = sp.sort ?? "newest";
  const view = sp.view === "list" ? "list" : "grid";

  const supabase = await createClient();
  const user = await getSessionUser();
  const cartCount = await getCartCount();

  // One unfiltered fetch backs both the facet options and the results, so the
  // dropdowns always offer values that actually exist in the catalogue.
  const { data: allData, error } = await supabase
    .from("listings")
    .select("*, cards(*), shops(*)")
    .eq("status", "active")
    .eq("sale_type", "fixed");

  let rows = (allData ?? []) as unknown as ListingCard[];

  const uniq = (pick: (l: ListingCard) => string | null): [string, string][] => {
    const s = new Set<string>();
    for (const l of rows) { const v = pick(l); if (v) s.add(v); }
    return [...s].sort().map((v) => [v, v]);
  };
  const setOptions = uniq((l) => l.cards?.set_name ?? null);
  const conditionOptions = uniq((l) => conditionLabel(l));
  const sellerOptions = (() => {
    const m = new Map<string, string>();
    for (const l of rows) if (l.shops) m.set(l.shops.id, l.shops.name);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  })();

  if (type === "graded") rows = rows.filter((l) => l.listing_type === "graded");
  if (type === "non_graded") rows = rows.filter((l) => l.listing_type === "non_graded");
  if (sp.set) rows = rows.filter((l) => l.cards?.set_name === sp.set);
  if (sp.condition) rows = rows.filter((l) => conditionLabel(l) === sp.condition);
  if (sp.seller) rows = rows.filter((l) => l.shop_id === sp.seller);
  if (sp.price && PRICE_BANDS[sp.price]) {
    const [lo, hi] = PRICE_BANDS[sp.price];
    rows = rows.filter((l) => Number(l.price) >= lo && Number(l.price) < hi);
  }

  rows =
    sort === "price_asc" ? [...rows].sort((a, b) => Number(a.price) - Number(b.price))
    : sort === "price_desc" ? [...rows].sort((a, b) => Number(b.price) - Number(a.price))
    : [...rows].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /** Preserve the other params when changing one. */
  const url = (patch: Partial<Search>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) next.set(k, String(v));
    return `/browse?${next.toString()}`;
  };

  const activeCount = [sp.set, sp.condition, sp.price, sp.seller].filter(Boolean).length
    + (type === "all" ? 0 : 1);

  const filterBar = (
    <form action="/browse" className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="sort" value={sort} />
      <input type="hidden" name="view" value={view} />
      <TypeTabs active={type} />
      <FilterSelect name="set" label="All Sets" value={sp.set} options={setOptions} />
      <FilterSelect name="condition" label="All Conditions" value={sp.condition} options={conditionOptions} />
      <FilterSelect name="price" label="All Prices" value={sp.price} options={[
        ["0-1000", "Under ₱1,000"],
        ["1000-2500", "₱1,000 – ₱2,500"],
        ["2500-5000", "₱2,500 – ₱5,000"],
        ["5000+", "₱5,000 and up"],
      ]} />
      <FilterSelect name="seller" label="All Sellers" value={sp.seller} options={sellerOptions} />
      <button className="h-11 rounded-md bg-primary px-4 text-body font-medium text-white transition-transform duration-(--duration-instant) active:scale-[0.98]">
        Apply
      </button>
      {activeCount > 0 && (
        <Link href="/browse" className="flex h-11 items-center px-2 text-body text-text-secondary underline">
          Clear all
        </Link>
      )}
    </form>
  );

  return (
    <AppShell user={shellUser(user)} cartCount={cartCount}>
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-display font-bold">Pokémon Cards for Sale</h1>
          <p className="mt-1 text-body text-text-secondary">
            Buy from verified Filipino collectors and vendors.
          </p>
        </header>

        {/* Desktop: the reference's horizontal filter bar.
            Mobile: the same controls inside the shared bottom sheet. */}
        <div className="rounded-lg border border-border bg-bg p-3">
          <div className="hidden lg:block">{filterBar}</div>
          <div className="flex items-center justify-between gap-2 lg:hidden">
            <FilterSheet mobileOnly activeCount={activeCount}>
              <div className="rounded-lg border border-border bg-bg p-(--card-pad)">
                {filterBar}
              </div>
            </FilterSheet>
            <ViewToggle view={view} url={(v) => url({ view: v })} />
          </div>
        </div>

        {error ? (
          <p className="rounded-lg border border-danger-bg bg-danger-bg px-4 py-3 text-body text-danger">
            Couldn&apos;t load listings: {error.message}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-body text-text-secondary">
                <span className="font-medium text-text-primary tabular">
                  {total.toLocaleString("en-PH")}
                </span>{" "}
                listing{total === 1 ? "" : "s"} found
              </p>
              <div className="flex items-center gap-2">
                <SortLinks active={sort} url={url} />
                <span className="hidden lg:block">
                  <ViewToggle view={view} url={(v) => url({ view: v })} />
                </span>
              </div>
            </div>

            <ListingResults
              listings={pageRows}
              view={view}
              empty="No listings match these filters yet."
            />

            {pages > 1 && (
              <nav className="flex items-center justify-center gap-1 pt-2" aria-label="Pagination">
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={url({ page: String(p) })}
                    aria-current={p === page ? "page" : undefined}
                    className={`grid h-11 min-w-11 place-items-center rounded-md px-3 text-body font-medium tabular ${
                      p === page
                        ? "bg-primary text-white"
                        : "border border-border bg-bg text-text-secondary hover:bg-bg-muted"
                    }`}
                  >
                    {p}
                  </Link>
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

/** Radio-backed so the tabs submit with the rest of the filter form. */
function TypeTabs({ active }: { active: string }) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Card type">
      {TYPES.map((t) => (
        <label
          key={t.value}
          className={`flex h-11 cursor-pointer items-center rounded-md px-4 text-body font-medium transition-colors duration-(--duration-instant) ${
            active === t.value
              ? "bg-primary-subtle text-primary-on-subtle"
              : "border border-border bg-bg text-text-secondary hover:bg-bg-muted"
          }`}
        >
          <input
            type="radio"
            name="type"
            value={t.value}
            defaultChecked={active === t.value}
            className="sr-only"
          />
          {t.label}
        </label>
      ))}
    </div>
  );
}

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
];

function SortLinks({
  active, url,
}: {
  active: string;
  url: (p: Partial<Search>) => string;
}) {
  return (
    <div className="hidden gap-1 sm:flex">
      {SORTS.map((s) => (
        <Link
          key={s.value}
          href={url({ sort: s.value })}
          className={`flex h-11 items-center rounded-md px-3 text-body transition-colors duration-(--duration-instant) ${
            active === s.value
              ? "bg-primary-subtle font-medium text-primary-on-subtle"
              : "text-text-secondary hover:bg-bg-muted"
          }`}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}
