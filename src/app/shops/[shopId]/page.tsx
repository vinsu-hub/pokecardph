import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ShoppingBag, ThumbsUp, Clock, Star, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { FilterSheet } from "@/components/shared/FilterSheet";
import { ListingResults, ViewToggle } from "@/components/buyer/ListingResults";
import { ShelfCardTilt } from "@/components/buyer/ShelfCardTilt";
import { ShelfScroller } from "@/components/buyer/ShelfScroller";
import { ShopFacetList } from "@/components/buyer/ShopFacetList";
import { ShopShelfCard } from "@/components/buyer/ShopShelfCard";
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
  // The toolbar's sort/view controls used to be unreachable while shelves
  // showed (gated behind !showShelves), so this never needed to check them.
  // Now that the toolbar lives in the always-visible tabs row, clicking sort
  // or the grid/list toggle must actually switch out of the curated shelves
  // into the flat sortable list — otherwise the click sets the URL param and
  // silently does nothing.
  const showShelves = cat === "all" && !q && selectedSets.length === 0
    && selectedRarities.length === 0 && !sp.sort && !sp.view;

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
    <div className="divide-y divide-border rounded-lg border border-border bg-bg">
      <section className="p-4">
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
      <section className="p-4">
        <h2 className="text-h3 font-semibold">Filter By</h2>
        <div className="divide-y divide-border">
          <div className="pb-3">
            <ShopFacetList
              title="Set" items={setFacets} param="set" selected={selectedSets}
              shopId={shopId} currentParams={sp} searchable
            />
          </div>
          <div className="pt-3">
            <ShopFacetList
              title="Rarity" items={rarityFacets} param="rarity" selected={selectedRarities}
              shopId={shopId} currentParams={sp}
            />
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <AppShell user={shellUser(user)} cartCount={cartCount}>
      {/* ---- Shop header: hero + tabs/toolbar read as one seamless box ---- */}
      <div className="enter">
        <header className="relative rounded-t-lg bg-gradient-to-br from-primary-subtle to-bg px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-center gap-5 sm:gap-6">
            {shop.logo_url ? (
              <Image
                src={shop.logo_url}
                alt={shop.name}
                width={110}
                height={110}
                className="size-[88px] shrink-0 rounded-full object-cover sm:size-[110px]"
              />
            ) : (
              <span className="grid size-[88px] shrink-0 place-items-center rounded-full bg-primary text-h2 font-bold text-white sm:size-[110px]">
                {shop.name.slice(0, 2).toUpperCase()}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-display font-bold tracking-tight">{shop.name}</h1>
                {shop.tier === "premium" && <StatusPill tone="paid">Premium Shop</StatusPill>}
                {shop.is_beta_vendor && <StatusPill tone="attention">Founding Vendor</StatusPill>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-5 text-body">
                <span className="flex items-center gap-1.5">★ {shop.rating} ({shop.review_count})</span>
                <span className="flex items-center gap-1.5">★ {shop.follower_count} followers</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-5 text-caption text-text-secondary">
                {shop.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" aria-hidden /> {shop.location}
                  </span>
                )}
                <span>
                  Joined{" "}
                  {new Date(shop.joined_at).toLocaleDateString("en-PH", { year: "numeric", month: "long" })}
                </span>
              </div>
            </div>

            <dl className="grid grid-cols-4 gap-2 sm:gap-2.5">
              {stats.map(({ label, value, Icon }) => (
                <div
                  key={label}
                  className="flex h-[76px] w-[70px] flex-col items-center justify-center gap-1 rounded-md border border-border bg-bg text-center sm:h-[98px] sm:w-[91px]"
                >
                  <Icon className="size-4 text-primary sm:size-5" aria-hidden />
                  <dd className="text-h3 font-bold tabular">{value}</dd>
                  <dt className="text-caption text-text-secondary">{label}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* Overlaps down out of the hero into the tabs/toolbar row below —
              still disabled with their existing reasons, only repositioned. */}
          <div className="absolute right-4 -bottom-4 z-20 flex gap-2 sm:right-[124px] sm:-bottom-[22px]">
            <button
              disabled
              title="Messaging arrives in a later release"
              className="flex h-[30px] cursor-not-allowed items-center rounded-md border border-border bg-bg px-3.5 text-caption font-bold text-text-secondary opacity-50"
            >
              Message Shop
            </button>
            <button
              disabled
              title="Following arrives in a later release"
              className="flex h-[30px] cursor-not-allowed items-center rounded-md bg-primary px-3.5 text-caption font-bold text-white opacity-50"
            >
              Follow
            </button>
          </div>
        </header>

        {/* ---- Tabs + toolbar, one row ---- */}
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-b-lg border-t border-border bg-bg px-4 py-3 sm:px-6">
          <nav className="flex flex-wrap items-end gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <Link
                key={t}
                href={`/shops/${shopId}?tab=${t}`}
                aria-current={tab === t ? "page" : undefined}
                className={`flex h-11 shrink-0 items-center border-b-2 px-4 text-body font-medium transition-colors duration-(--duration-fast) ${
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

          {tab === "shop" && (
            <form action={`/shops/${shopId}`} className="flex flex-wrap items-center gap-2 pb-1">
              <label htmlFor="shopSearch" className="sr-only">Search in shop</label>
              <input
                id="shopSearch" name="q" type="search" defaultValue={q}
                placeholder="Search in shop…"
                className="h-9 w-[176px] min-w-0 rounded-md border border-border px-3 text-caption outline-none focus:border-primary"
              />
              <button className="h-9 rounded-md border border-border px-3 text-caption font-medium text-text-secondary hover:bg-bg-muted">
                Search
              </button>

              <div className="flex overflow-hidden rounded-md border border-border">
                {([["newest", "Newest"], ["price_asc", "Price ↑"], ["price_desc", "Price ↓"]] as const).map(([v, label]) => (
                  <Link
                    key={v}
                    href={url({ sort: v === "newest" ? undefined : v })}
                    className={`flex h-9 items-center px-2.5 text-caption ${
                      sort === v ? "bg-primary-subtle font-medium text-primary-on-subtle" : "text-text-secondary hover:bg-bg-muted"
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
              <ViewToggle view={view} url={(v) => url({ view: v === "grid" ? undefined : v })} />
            </form>
          )}
        </div>
      </div>

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
            {/* Search/sort/view-toggle now live in the tabs+toolbar row above
                (always reachable there, not gated behind shelf/grid mode). */}
            {showShelves ? (
              <div className="flex flex-col gap-8">
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
            <ShelfCardTilt key={l.id}>
              <ShopShelfCard listing={l} />
            </ShelfCardTilt>
          ))}
        </ShelfScroller>
        <span aria-hidden className="shelf-plane" />
      </div>
    </section>
  );
}
