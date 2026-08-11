import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { LandingHeader } from "@/components/shared/LandingHeader";
import { LandingPreview, type PreviewCard } from "@/components/shared/LandingPreview";
import { GoogleMark } from "@/components/shared/GoogleMark";
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

  const [{ data: saleRows }, { data: auctionRows }] = await Promise.all([
    supabase
      .from("listings")
      .select("id, price, photos, cards(name, set_name, rarity, image_url), shops(name, rating)")
      .eq("status", "active")
      .eq("sale_type", "fixed")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("auctions")
      .select("id, current_bid, starting_bid, listings(description, item_category, cards(name, set_name, rarity, image_url), shops(name, rating))")
      .in("status", ["scheduled", "live"])
      .order("end_time", { ascending: true })
      .limit(10),
  ]);

  type SaleRow = { id: string; price: number; photos: unknown; cards: Card | null; shops: Shop | null };
  type AuctionRow = {
    id: string;
    current_bid: number | null;
    starting_bid: number;
    listings: (Pick<Listing, "description" | "item_category"> & { cards: Card | null; shops: Shop | null }) | null;
  };

  const forSale: PreviewCard[] = ((saleRows ?? []) as unknown as SaleRow[])
    .filter((l) => l.cards && l.shops)
    .map((l) => ({
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

  const auctions: PreviewCard[] = ((auctionRows ?? []) as unknown as AuctionRow[])
    .filter((a) => a.listings?.cards && a.listings?.shops)
    .map((a) => ({
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
              Collect. Trade. Battle. <span className="text-primary">Connect.</span>
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

            <button
              type="button"
              disabled
              title="Google Sign-In is coming soon"
              className="mt-3 flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-md border border-border bg-bg text-body font-medium opacity-50"
            >
              <GoogleMark />
              Continue with Google
            </button>

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
          <Image
            src="/brand/landing-hero.webp"
            alt=""
            fill
            priority
            sizes="50vw"
            className="object-cover"
          />
        </div>
      </main>
    </div>
  );
}
