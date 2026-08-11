import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { ListingCardTile } from "@/components/buyer/ListingCardTile";
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
 */
export const dynamic = "force-dynamic";

const TABS = ["shop", "about", "reviews", "trade"] as const;
const TAB_LABEL: Record<string, string> = {
  shop: "Shop", about: "About", reviews: "Reviews", trade: "Trade Info",
};

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ shopId: string }>;
  searchParams: Promise<{ tab?: string; cat?: string; set?: string; rarity?: string }>;
}) {
  const { shopId } = await params;
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? sp.tab! : "shop";

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
  if (sp.set) visible = visible.filter((l) => l.cards?.set_name === sp.set);
  if (sp.rarity) visible = visible.filter((l) => l.cards?.rarity === sp.rarity);

  // Featured = highest-value listings. Excluded from the shelves below so a
  // shop with one category doesn't render the same six cards twice.
  const featured = all.slice(0, 6);
  const featuredIds = new Set(featured.map((l) => l.id));
  const shelfGraded = graded.filter((l) => !featuredIds.has(l.id));
  const shelfRaw = raw.filter((l) => !featuredIds.has(l.id));

  const stats = [
    ["Sales", `${shop.review_count * 4}+`],
    ["Positive Feedback", `${Math.round(shop.positive_feedback_pct ?? 98)}%`],
    ["Avg. Response", shop.avg_response_time ?? "2h"],
    ["Shop Rating", `${shop.rating}★`],
  ];

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
              {shop.tier === "premium" && (
                <span className="rounded-full bg-paid-bg px-2.5 py-0.5 text-caption font-medium text-paid">
                  Premium Shop
                </span>
              )}
            </div>
            <p className="mt-1 text-body text-text-secondary">
              ★ {shop.rating} ({shop.review_count}) · {shop.follower_count} followers
            </p>
            <p className="text-caption text-text-secondary">
              {shop.location} · Joined{" "}
              {new Date(shop.joined_at).toLocaleDateString("en-PH", { year: "numeric", month: "long" })}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(([k, v]) => (
              <div key={k} className="rounded-md bg-bg px-3 py-2 text-center">
                <dd className="text-h3 font-bold tabular">{v}</dd>
                <dt className="text-caption text-text-secondary">{k}</dt>
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
          {/* ---- Shop categories sidebar ---- */}
          <aside className="enter enter-d2 lg:w-[240px] lg:shrink-0">
            <section className="rounded-lg border border-border bg-bg p-4">
              <h2 className="text-h3 font-semibold">Shop Categories</h2>
              <ul className="mt-2 flex flex-col">
                {categories.map(([key, label, items]) => (
                  <li key={key}>
                    <Link
                      href={`/shops/${shopId}?cat=${key}`}
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

            {/* Filter By — the reference's second sidebar block. */}
            <section className="mt-4 rounded-lg border border-border bg-bg p-4">
              <h2 className="text-h3 font-semibold">Filter By</h2>
              <FacetList title="Set" items={setFacets} param="set" current={sp.set} shopId={shopId} sp={sp} />
              <FacetList title="Rarity" items={rarityFacets} param="rarity" current={sp.rarity} shopId={shopId} sp={sp} />
            </section>
          </aside>

          <div className="min-w-0 flex-1">
            {cat === "all" && !sp.set && !sp.rarity ? (
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
                <h2 className="text-h2 font-semibold">
                  {categories.find(([k]) => k === cat)![1]}
                </h2>
                <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  {visible.map((l) => (
                    <li key={l.id}><ListingCardTile listing={l} /></li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

/**
 * A shelf row. Scrolls horizontally inside its own container — the page body
 * itself never scrolls sideways, which is the hard rule.
 */
function FacetList({
  title, items, param, current, shopId, sp,
}: {
  title: string;
  items: [string, number][];
  param: string;
  current?: string;
  shopId: string;
  sp: Record<string, string | undefined>;
}) {
  if (items.length === 0) return null;
  const href = (value?: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, [param]: value })) if (v) q.set(k, String(v));
    const s = q.toString();
    return `/shops/${shopId}${s ? `?${s}` : ""}`;
  };
  return (
    <div className="mt-3">
      <h3 className="text-caption font-medium text-text-secondary">{title}</h3>
      <ul className="mt-1 flex flex-col">
        {items.slice(0, 5).map(([value, count]) => {
          const on = current === value;
          return (
            <li key={value}>
              <Link
                href={href(on ? undefined : value)}
                aria-pressed={on}
                className={`flex h-11 items-center justify-between gap-2 rounded-md px-2 text-body ${
                  on ? "bg-primary-subtle font-medium text-primary-on-subtle" : "hover:bg-bg-muted"
                }`}
              >
                <span className="min-w-0 truncate">{value}</span>
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
        <ul className="relative z-10 flex gap-4 overflow-x-auto pb-6">
          {listings.map((l) => (
            <li key={l.id} className="shelf-item relative w-[160px] shrink-0 sm:w-[200px]">
              <ListingCardTile listing={l} />
            </li>
          ))}
        </ul>
        <span aria-hidden className="shelf-plane" />
      </div>
    </section>
  );
}
