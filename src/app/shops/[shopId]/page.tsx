import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ShoppingBag, ThumbsUp, Clock, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { FilterSheet } from "@/components/shared/FilterSheet";
import { ListingCardTile } from "@/components/buyer/ListingCardTile";
import { ListingResults, ViewToggle } from "@/components/buyer/ListingResults";
import { ShelfScroller } from "@/components/buyer/ShelfScroller";
import { StatusPill } from "@/components/shared/StatusPill";
import { getCartCount } from "@/lib/cart";
import type { ListingCard } from "@/lib/supabase/types";

/**
 * Shop Storefront.
 * Reference: REFERENCE IMAGES/VENDOR STORE VIEW.png — despite the filename,
 * that image is this buyer-facing storefront.
 *
 * Structure per the reference: shop header with stats and Message/Follow,
 * tabs, a left sidebar of shop categories with counts, and shelf-style rows
 * with "View all". The shelving is what the storefront animation spec
 * orchestrates on entrance.
 *
 * Search/facets/sort/grid-list mirror /search's established patterns
 * (ListingResults, ViewToggle, FilterSheet) rather than reimplementing them.
 * Facets are multi-select (comma-joined query params) here, unlike the
 * earlier single-value version. Submitting a search query, or selecting any
 * facet, switches out of the curated shelf view into a flat, sortable result
 * list — shelves are grouped/curated, not a single list with a sort order.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shopId: string }>;
}): Promise<Metadata> {
  const { shopId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("shops")
    .select("name, description")
    .eq("id", shopId)
    .maybeSingle();
  if (!data) return { title: "Shop — PokeCard PH" };
  return {
    title: `${data.name} — PokeCard PH`,
    description: data.description ?? `${data.name}'s storefront on PokeCard PH.`,
  };
}

const TABS = ["shop", "about", "reviews", "trade"] as const;
const TAB_LABEL: Record<string, string> = {
  shop: "Shop", about: "About", reviews: "Reviews", trade: "Trade Info",
};

type ShopSearch = {
  tab?: string; cat?: string; set?: string; rarity?: string;
  q?: string; sort?: string; view?: string;
};

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ shopId: string }>;
  searchParams: Promise<ShopSearch>;
}) {
  const { shopId } = await params;
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? sp.tab! : "shop";
  const q = (sp.q ?? "").trim();
  const view = sp.view === "list" ? "list" : "grid";
  const sort = sp.sort ?? "newest";
  const selectedSets = sp.set ? sp.set.split(",").filter(Boolean) : [];
  const selectedRarities = sp.rarity ? sp.rarity.split(",").filter(Boolean) : [];

  const supabase = await createClient();
  const user = await getSessionUser();
  const cartCount = await getCartCount();

  const { data: shop } = await supabase
    .from("shops").select("*").eq("id", shopId).maybeSingle();
  if (!shop) notFound();

  const { data } = await supabase
    .from("listings")
    .select("*, cards(*), shops(*)")
    .eq("shop_id", shopId)
    .eq("status", "active")
    .eq("sale_type", "fixed")
    .order("price", { ascending: false });

  const all = (data ?? []) as unknown as ListingCard[];
  const graded = all.filter((l) => l.listing_type === "graded");
  const raw = all.filter((l) => l.listing_type === "non_graded");

  const categories: [string, string, ListingCard[]][] = [
    ["all", "All Cards", all],
    ["graded", "Graded Cards", graded],
    ["non_graded", "Non-Graded Cards", raw],
  ];
  const cat = sp.cat && categories.some(([k]) => k === sp.cat) ? sp.cat : "all";

  const facet = (src: ListingCard[], pick: (l: ListingCard) => string | null) => {
    const m = new Map<string, number>();
    for (const l of src) { const k = pick(l); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const setFacets = facet(all, (l) => l.cards?.set_name ?? null);
  const rarityFacets = facet(all, (l) => l.cards?.rarity ?? null);

  let visible = categories.find(([k]) => k === cat)![2];
  if (selectedSets.length) visible = visible.filter((l) => l.cards?.set_name && selectedSets.includes(l.cards.set_name));
  if (selectedRarities.length) visible = visible.filter((l) => l.cards?.rarity && selectedRarities.includes(l.cards.rarity));
  if (q) visible = visible.filter((l) => l.cards?.name.toLowerCase().includes(q.toLowerCase()));

  visible =
    sort === "price_asc" ? [...visible].sort((a, b) => Number(a.price) - Number(b.price))
    : sort === "price_desc" ? [...visible].sort((a, b) => Number(b.price) - Number(a.price))
    : [...visible].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  // Featured = highest-value listings. Excluded from the shelves below so a
  // shop with one category doesn't render the same six cards twice.
  const featured = all.slice(0, 6);
  const featuredIds = new Set(featured.map((l) => l.id));
  const shelfGraded = graded.filter((l) => !featuredIds.has(l.id));
  const shelfRaw = raw.filter((l) => !featuredIds.has(l.id));

  // Shelves are curated/grouped, not a sortable flat list — any search query
  // or facet selection switches to the flat, sortable grid/list view instead.
  const showShelves = cat === "all" && !q && selectedSets.length === 0 && selectedRarities.length === 0;

  const stats = [
    { label: "Sales", value: `${shop.review_count * 4}+`, Icon: ShoppingBag },
    { label: "Positive Feedback", value: `${Math.round(shop.positive_feedback_pct ?? 98)}%`, Icon: ThumbsUp },
    { label: "Avg. Response", value: shop.avg_response_time ?? "2h", Icon: Clock },
    { label: "Shop Rating", value: `${shop.rating}`, Icon: Star },
  ];

  /** Build a shop URL preserving the other params — same shape as /search's `url()`. */
  const url = (patch: Partial<ShopSearch>) => {
    const next = new URLSearchParams();
    const merged = { ...sp, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, String(v));
    const s = next.toString();
    return `/shops/${shopId}${s ? `?${s}` : ""}`;
  };

  const sidebar = (
    <>
      <section className="rounded-lg border border-border bg-bg p-4">
        <h2 className="text-h3 font-semibold">Shop Categories</h2>
        <ul className="mt-2 flex flex-col">
          {categories.map(([key, label, items]) => (
            <li key={key}>
              <Link
                href={url({ cat: key === "all" ? undefined : key, set: undefined, rarity: undefined, q: undefined })}
                aria-current={cat === key ? "true" : undefined}
                className={`flex h-11 items-center justify-between gap-2 rounded-md px-2 text-body ${
                  cat === key ? "bg-primary-subtle font-medium text-primary-on-subtle" : "hover:bg-bg-muted"
                }`}
              >
                <span className="truncate">{label}</span>
                <span className="shrink-0 text-caption text-text-secondary tabular">
                  {items.length}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Filter By — the reference's second sidebar block. Multi-select: each
          value toggles membership rather than replacing a single selection. */}
      <section className="mt-4 rounded-lg border border-border bg-bg p-4">
        <h2 className="text-h3 font-semibold">Filter By</h2>
        <FacetList title="Set" items={setFacets} param="set" selected={selectedSets} url={url} />
        <FacetList title="Rarity" items={rarityFacets} param="rarity" selected={selectedRarities} url={url} />
      </section>
    </>
  );

  return (
    <AppShell user={shellUser(user)} cartCount={cartCount}>
      {/* ---- Shop header ---- */}
      <header className="enter rounded-lg border border-border bg-primary-subtle p-(--card-pad)">
        <div className="flex flex-wrap items-start gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-primary text-h3 font-bold text-white">
            {shop.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-display font-bold">{shop.name}</h1>
              {shop.tier === "premium" && <StatusPill tone="paid">Premium Shop</StatusPill>}
              {shop.is_beta_vendor && <StatusPill tone="attention">Founding Vendor</StatusPill>}
            </div>
            <p className="mt-1 text-body text-text-secondary">
              ★ {shop.rating} ({shop.review_count}) · {shop.follower_count} followers
            </p>
            <p className="text-caption text-text-secondary">
              {shop.location}
              {shop.location && " · "}
              Joined{" "}
              {new Date(shop.joined_at).toLocaleDateString("en-PH", { year: "numeric", month: "long" })}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(({ label, value, Icon }) => (
              <div key={label} className="rounded-md bg-bg px-3 py-2 text-center">
                <dd className="flex items-center justify-center gap-1.5 text-h3 font-bold tabular">
                  <Icon className="size-4 text-primary" aria-hidden />
                  {value}
                </dd>
                <dt className="text-caption text-text-secondary">{label}</dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            disabled
            title="Messaging arrives in a later release"
            className="h-11 cursor-not-allowed rounded-md border border-border bg-bg px-4 text-body font-medium opacity-50"
          >
            Message Shop
          </button>
          <button
            disabled
            title="Following arrives in a later release"
            className="h-11 cursor-not-allowed rounded-md bg-primary px-4 text-body font-medium text-white opacity-50"
          >
            Follow
          </button>
        </div>
      </header>

      {/* ---- Tabs ---- */}
      <nav className="enter enter-d1 mt-4 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/shops/${shopId}?tab=${t}`}
            aria-current={tab === t ? "page" : undefined}
            className={`flex h-11 items-center border-b-2 px-4 text-body font-medium transition-colors duration-(--duration-fast) ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {TAB_LABEL[t]}
            {t === "reviews" && (
              <span className="ml-1.5 text-caption text-text-secondary tabular">
                ({shop.review_count})
              </span>
            )}
          </Link>
        ))}
      </nav>

      {tab !== "shop" ? (
        <section className="mt-6 rounded-lg border border-border bg-bg p-(--card-pad)">
          {tab === "about" && (
            <>
              <h2 className="text-h2 font-semibold">About {shop.name}</h2>
              <p className="mt-2 text-body text-text-secondary">
                {shop.description ??
                  `${shop.name} is a verified vendor based in ${shop.location}, trading on PokeCard PH since ${new Date(shop.joined_at).getFullYear()}.`}
              </p>
            </>
          )}
          {tab === "reviews" && (
            <>
              <h2 className="text-h2 font-semibold">Reviews</h2>
              <p className="mt-2 text-body text-text-secondary">
                {shop.review_count} reviews · ★ {shop.rating} average. Individual
                reviews arrive with the ratings feature.
              </p>
            </>
          )}
          {tab === "trade" && (
            <>
              <h2 className="text-h2 font-semibold">Trade Info</h2>
              <p className="mt-2 text-body text-text-secondary">
                This shop accepts card-for-card trades with in-person meetup
                verification.
              </p>
              <Link
                href="/trade"
                className="mt-3 inline-flex h-11 items-center rounded-md border border-primary px-4 text-body font-medium text-primary"
              >
                Build a trade
              </Link>
            </>
          )}
        </section>
      ) : all.length === 0 ? (
        <p className="mt-6 rounded-lg border border-border bg-bg px-6 py-12 text-center text-body text-text-secondary">
          This shop has no active listings right now.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          {/* ---- Shop categories + filters ---- */}
          <div className="enter enter-d2">
            <FilterSheet activeCount={selectedSets.length + selectedRarities.length} className="lg:w-[240px]">
              {sidebar}
            </FilterSheet>
          </div>

          <div className="min-w-0 flex-1">
            {/* Search-in-shop — always reachable regardless of shelf/grid
                mode; submitting switches to the flat result list, same as
                selecting a facet does. */}
            <form action={`/shops/${shopId}`} className="flex flex-wrap items-center gap-2">
              {tab !== "shop" && <input type="hidden" name="tab" value={tab} />}
              <label htmlFor="shopSearch" className="sr-only">Search in shop</label>
              <input
                id="shopSearch" name="q" type="search" defaultValue={q}
                placeholder="Search in shop…"
                className="h-11 min-w-0 flex-1 rounded-md border border-border px-3 text-body outline-none focus:border-primary sm:max-w-[280px]"
              />
              <button className="h-11 rounded-md border border-border px-4 text-body font-medium text-text-secondary hover:bg-bg-muted">
                Search
              </button>

              {!showShelves && (
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <div className="flex gap-1">
                    {([["newest", "Newest"], ["price_asc", "Price ↑"], ["price_desc", "Price ↓"]] as const).map(([v, label]) => (
                      <Link key={v} href={url({ sort: v === "newest" ? undefined : v })}
                        className={`flex h-11 items-center rounded-md px-3 text-body ${
                          sort === v ? "bg-primary-subtle font-medium text-primary-on-subtle" : "text-text-secondary hover:bg-bg-muted"
                        }`}>
                        {label}
                      </Link>
                    ))}
                  </div>
                  <ViewToggle view={view} url={(v) => url({ view: v === "grid" ? undefined : v })} />
                </div>
              )}
            </form>

            {showShelves ? (
              <div className="mt-6 flex flex-col gap-8">
                <Shelf title="Featured Cards" listings={featured} shopId={shopId} delay="enter-d3" />
                {shelfGraded.length > 0 && (
                  <Shelf title="Graded Cards" listings={shelfGraded} shopId={shopId} cat="graded" delay="enter-d4" />
                )}
                {shelfRaw.length > 0 && (
                  <Shelf title="Non-Graded Cards" listings={shelfRaw} shopId={shopId} cat="non_graded" delay="enter-d5" />
                )}
              </div>
            ) : (
              <>
                <h2 className="mt-4 text-h2 font-semibold">
                  {q ? <>Results for &ldquo;{q}&rdquo;</> : categories.find(([k]) => k === cat)![1]}
                </h2>
                <ListingResults listings={visible} view={view} empty="Nothing matched. Try removing a filter." />
              </>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function FacetList({
  title, items, param, selected, url,
}: {
  title: string;
  items: [string, number][];
  param: "set" | "rarity";
  selected: string[];
  url: (patch: Partial<ShopSearch>) => string;
}) {
  if (items.length === 0) return null;
  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    return url({ [param]: next.length ? next.join(",") : undefined } as Partial<ShopSearch>);
  };
  return (
    <div className="mt-3">
      <h3 className="text-caption font-medium text-text-secondary">{title}</h3>
      <ul className="mt-1 flex flex-col">
        {items.slice(0, 5).map(([value, count]) => {
          const on = selected.includes(value);
          return (
            <li key={value}>
              <Link
                href={toggle(value)}
                aria-pressed={on}
                className={`flex h-11 items-center gap-2 rounded-md px-2 text-body ${
                  on ? "bg-primary-subtle font-medium text-primary-on-subtle" : "hover:bg-bg-muted"
                }`}
              >
                <span
                  aria-hidden
                  className={`grid size-4 shrink-0 place-items-center rounded border ${
                    on ? "border-primary bg-primary text-white" : "border-border"
                  }`}
                >
                  {on && "✓"}
                </span>
                <span className="min-w-0 flex-1 truncate text-left">{value}</span>
                <span className="shrink-0 text-caption text-text-secondary tabular">{count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Shelf({
  title, listings, shopId, cat, delay,
}: {
  title: string; listings: ListingCard[]; shopId: string; cat?: string; delay?: string;
}) {
  return (
    <section className={`enter ${delay ?? ""}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-h2 font-semibold">{title}</h2>
        {cat && (
          <Link href={`/shops/${shopId}?cat=${cat}`} className="text-body text-primary">
            View all →
          </Link>
        )}
      </div>

      {/* The row scrolls inside its own container — the page body never
          scrolls sideways. The shelf plane sits behind the cards and is
          purely decorative, so it's aria-hidden and pointer-events:none. */}
      <div className="shelf relative mt-3">
        <ShelfScroller>
          {listings.map((l) => (
            <li key={l.id} className="shelf-item relative w-[160px] shrink-0 sm:w-[200px]">
              <ListingCardTile listing={l} />
            </li>
          ))}
        </ShelfScroller>
        <span aria-hidden className="shelf-plane" />
      </div>
    </section>
  );
}
