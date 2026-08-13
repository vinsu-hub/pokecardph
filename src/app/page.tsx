import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { LandingHeader } from "@/components/shared/LandingHeader";
import { LandingPreview, type PreviewCard } from "@/components/shared/LandingPreview";
import { LandingGoogleButton } from "@/components/shared/LandingGoogleButton";
import { primaryPhoto } from "@/lib/photos";
import type { Card, Listing, Shop } from "@/lib/supabase/types";

/**
 * Marketing landing page.
 * Reference: REFERENCE IMAGES/MAIN LANDING PAGE.png,
 *            REFERENCE IMAGES/LANDING PAGE IMAGE BACKGROUND.png (the hero photo itself)
 *
 * Lives at the domain root, but only for signed-out visitors — a signed-in
 * session redirects straight to /browse, the real marketplace. This is new
 * scope, not a rename: through Phase 7 the root WAS Home/Browse, chosen
 * deliberately so window-shopping needed no account and no splash screen.
 * That "no browse wall" property is preserved, just moved down one click —
 * "Explore" in the header and "View All" on every preview tab go straight to
 * /browse with no gate.
 */
export const dynamic = "force-dynamic";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (user) {
    // Preserve query params on the redirect — a link like "/?type=graded"
    // (bookmarked, shared, or from before this route existed) should still
    // land a signed-in visitor on the filtered grid, not silently drop intent.
    const sp = await searchParams;
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (typeof v === "string") qs.set(k, v);
    }
    const query = qs.toString();
    redirect(query ? `/browse?${query}` : "/browse");
  }

  const supabase = await createClient();
  const FEATURED_COUNT = 5;

  const [{ data: saleRows }, { data: auctionRows }, { data: soldItems }] = await Promise.all([
    supabase
      .from("listings")
      .select("id, price, photos, created_at, card_id, cards(name, set_name, rarity, image_url), shops(name, rating)")
      .eq("status", "active")
      .eq("sale_type", "fixed"),
    supabase
      .from("auctions")
      .select("id, current_bid, starting_bid, bid_count, end_time, listings(description, item_category, cards(name, set_name, rarity, image_url), shops(name, rating))")
      .in("status", ["scheduled", "live"]),
    // Sales count per card, for ranking "best selling" — supabase-js has no
    // GROUP BY, so this aggregates the (small) completed-order set in JS
    // rather than adding a view for one landing-page ranking. order_items has
    // both order_id and listing_id as direct FKs (not nested through each
    // other), so orders and listings are two separate embeds here.
    supabase
      .from("order_items")
      .select("quantity, listings(card_id), orders!inner(status)")
      .eq("orders.status", "completed"),
  ]);

  type SaleRow = {
    id: string; price: number; photos: unknown; created_at: string; card_id: string | null;
    cards: Card | null; shops: Shop | null;
  };
  type AuctionRow = {
    id: string; current_bid: number | null; starting_bid: number; bid_count: number; end_time: string;
    listings: (Pick<Listing, "description" | "item_category"> & { cards: Card | null; shops: Shop | null }) | null;
  };

  const salesByCard = new Map<string, number>();
  for (const row of (soldItems ?? []) as unknown as { quantity: number; listings: { card_id: string | null } }[]) {
    const cardId = row.listings?.card_id;
    if (cardId) salesByCard.set(cardId, (salesByCard.get(cardId) ?? 0) + row.quantity);
  }

  const saleCandidates = ((saleRows ?? []) as unknown as SaleRow[]).filter((l) => l.cards && l.shops);

  /** Real photography first — a marketing showcase risking a gradient/text
   *  placeholder tile looks unfinished, so cards with real image_url sort
   *  ahead of everything else here. This is landing-page-only bias: /browse
   *  and /search keep ranking purely by the sales data below, untouched.
   *  Within each group, best-selling first, ties broken by newest, so the
   *  ranking is never arbitrary even before real sales volume exists — it
   *  degrades gracefully to "newest" rather than to an undefined sort order. */
  const bestSelling = [...saleCandidates].sort((a, b) => {
    const hasImage = (l: SaleRow) => (l.cards!.image_url ? 1 : 0);
    const img = hasImage(b) - hasImage(a);
    if (img !== 0) return img;
    const sold = (salesByCard.get(b.card_id ?? "") ?? 0) - (salesByCard.get(a.card_id ?? "") ?? 0);
    if (sold !== 0) return sold;
    return +new Date(b.created_at) - +new Date(a.created_at);
  });

  const forSale: PreviewCard[] = bestSelling.slice(0, FEATURED_COUNT).map((l) => ({
    id: l.id,
    href: `/card/${l.id}`,
    name: l.cards!.name,
    subtitle: l.cards!.rarity ?? l.cards!.set_name,
    price: Number(l.price),
    sellerName: l.shops!.name,
    sellerRating: Number(l.shops!.rating),
    imageUrl: primaryPhoto(l.photos) ?? l.cards!.image_url,
  }));

  // Every active listing already supports "Trade for This Card" on Card
  // Detail — there's no separate for-trade inventory, so this reuses the same
  // feed under an accurate label rather than querying something that doesn't
  // exist as its own concept.
  const forTrade = forSale;

  const auctionCandidates = ((auctionRows ?? []) as unknown as AuctionRow[]).filter(
    (a) => a.listings?.cards && a.listings?.shops,
  );
  const mostBid = [...auctionCandidates].sort((a, b) => {
    const bids = b.bid_count - a.bid_count;
    if (bids !== 0) return bids;
    return +new Date(a.end_time) - +new Date(b.end_time); // soonest-ending
  });

  const auctions: PreviewCard[] = mostBid.slice(0, FEATURED_COUNT).map((a) => ({
    id: a.id,
    href: `/auctions/${a.id}`,
    name: a.listings!.cards!.name,
    subtitle: a.listings!.cards!.rarity ?? a.listings!.cards!.set_name,
    price: Number(a.current_bid ?? a.starting_bid),
    sellerName: a.listings!.shops!.name,
    sellerRating: Number(a.listings!.shops!.rating),
    imageUrl: a.listings!.cards!.image_url,
  }));

  return (
    <div className="flex min-h-svh flex-col">
      <LandingHeader />

      <main className="grid flex-1 lg:grid-cols-2">
        {/* ---- Left: pitch + preview + CTA ---- */}
        <div className="flex min-w-0 flex-col justify-center px-(--gutter) py-10 lg:py-16">
          <div className="mx-auto w-full max-w-[560px]">
            <h1 className="text-display font-bold" style={{ fontSize: "clamp(2.25rem, 4vw, 3rem)", lineHeight: 1.1 }}>
              Collect. Trade. <span className="text-primary">Connect.</span>
            </h1>
            <p className="mt-3 text-body text-text-secondary">
              The trusted marketplace for Pokémon cards and collectibles in the Philippines.
            </p>

            <div className="mt-6">
              <LandingPreview forSale={forSale} auctions={auctions} forTrade={forTrade} />
            </div>

            <p className="mt-8 text-center text-body text-text-secondary">
              Join thousands of trainers and collectors today!
            </p>

            <LandingGoogleButton />

            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-caption text-text-muted">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="flex gap-3">
              <Link
                href="/login"
                className="flex h-11 flex-1 items-center justify-center rounded-md bg-primary text-body font-medium text-white transition-colors duration-(--duration-instant) hover:bg-primary-hover"
              >
                Sign Up
              </Link>
              <Link
                href="/login"
                className="flex h-11 flex-1 items-center justify-center rounded-md border border-border text-body font-medium text-text-primary hover:bg-bg-muted"
              >
                Log In
              </Link>
            </div>

            <p className="mt-4 text-center text-caption text-text-muted">
              By continuing, you agree to our{" "}
              <span title="Coming soon">Terms of Service</span> and{" "}
              <span title="Coming soon">Privacy Policy</span>.
            </p>
          </div>
        </div>

        {/* ---- Right: hero photo ---- */}
        <div className="relative hidden min-h-[420px] lg:block">
          {/* unoptimized: this is a single pre-encoded static asset (already
              WebP, already at its full native resolution), not user content —
              skipping Next's own resize/recompress pipeline guarantees the
              exact file on disk is what ships, with no risk of a smaller
              width bucket getting served on a large viewport and reading as
              soft/blurry. */}
          <Image
            src="/brand/landing-hero.webp"
            alt=""
            fill
            priority
            unoptimized
            className="object-cover"
          />
          {/* Reference: MAIN LANDING PAGE.png — the photo isn't a hard-edged
              panel, a white gradient bleeds from the left panel into it. This
              overlay recreates that seam rather than leaving the vertical
              line a plain two-column split produces. */}
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 w-1/3"
            style={{
              background: "linear-gradient(to right, var(--color-bg) 0%, color-mix(in srgb, var(--color-bg) 40%, transparent) 60%, transparent 100%)",
            }}
          />
        </div>
      </main>
    </div>
  );
}
