import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ShieldCheck, Lock, Truck, BadgeCheck, HelpCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import {
  StickyActionBar,
  StickyActionBarSpacer,
} from "@/components/shared/StickyActionBar";
import { php } from "@/lib/utils";
import { conditionLabel, type ListingCard } from "@/lib/supabase/types";
import { getCartCount } from "@/lib/cart";
import { addToCart } from "@/lib/cart-actions";
import { CardImageGallery } from "@/components/buyer/CardImageGallery";
import { CardCondition } from "@/components/buyer/CardCondition";
import { CardDetailsGrid } from "@/components/buyer/CardDetailsGrid";
import { MarketPrice } from "@/components/buyer/MarketPrice";
import { TradeThisCard } from "@/components/buyer/TradeThisCard";
import { SimilarListingsShelf } from "@/components/buyer/SimilarListingsShelf";

/**
 * Card Detail (2D).
 *
 * Reference: `REFERENCE IMAGES/ITEM VIEW WITH 2D IMAGE ONLY.png` — confirmed
 * during the Phase 12a verification pass to be this screen's real reference
 * (the doc set previously said none existed; `ITEM VIEW WITH 3D MODEL
 * VIEW.png` is the separate Phase 7 3D Inspection page).
 *
 * The 3D toggle routes to /card/[id]/3d (Phase 7).
 *
 * Deliberately NOT built (unspecced mockup features, raised not dropped):
 * AR View, Pop. Higher, Add to Watchlist. No fake grade-quality descriptor
 * word (e.g. "EX-MT") next to the grade number, and no "Year" field — same
 * reasoning: don't fabricate a number/word a buyer would read as real data.
 */

export const dynamic = "force-dynamic";

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getSessionUser();
  const cartCount = await getCartCount();

  const { data } = await supabase
    .from("listings")
    .select("*, cards(*), shops(*)")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const listing = data as unknown as ListingCard;
  const { cards: card, shops: shop } = listing;
  // card_id is nullable since Phase 4 (sealed product, merch, and signed
  // items have no catalog card) — this page is only meaningful for a real
  // card, so treat a null join the same as a missing listing rather than
  // let every section below assume `card` is always populated.
  if (!card || !shop) notFound();

  const shopInitials = shop.name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <AppShell user={shellUser(user)} cartCount={cartCount}>
      <nav className="mb-4 text-caption text-text-secondary">
        <Link href="/browse" className="hover:text-text-primary">Home</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/shops/${shop.id}`} className="hover:text-text-primary">{shop.name}</Link>
        <span className="mx-1.5">›</span>
        <span className="text-text-primary">{card.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* ---------------- Image panel + left-column sections ---------------- */}
        <div>
          <div className="flex gap-2">
            <span className="rounded-md bg-primary px-3 py-1.5 text-caption font-medium text-white">
              2D View
            </span>
            <Link
              href={`/card/${listing.id}/3d`}
              className="rounded-md border border-border px-3 py-1.5 text-caption font-medium text-text-secondary transition-colors duration-(--duration-instant) hover:border-primary hover:text-primary"
            >
              3D View
            </Link>
          </div>

          {/* Portrait, not the old 4:3 landscape box — a real card photo in a
              landscape frame gets cropped through the artwork. Capped by height
              so a tall card can't push the buy panel off the fold. */}
          <CardImageGallery listing={listing} />

          <CardCondition listing={listing} />
          <CardDetailsGrid card={card} listing={listing} description={listing.description} />
          <MarketPrice card={card} listing={listing} />
          <TradeThisCard userId={user?.id ?? null} listingId={listing.id} shopId={shop.id} />
          <SimilarListingsShelf card={card} currentListingId={listing.id} />
        </div>

        {/* ---------------- Buy panel ---------------- */}
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-bg p-(--card-pad)">
            <h1 className="text-h2 font-semibold">{card.name}</h1>
            <p className="mt-1 text-body text-text-secondary">
              {[card.rarity, card.set_name, card.card_number, card.language]
                .filter(Boolean)
                .join(" · ")}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-grade-bg px-2.5 py-1 text-caption font-medium text-grade-text">
                {conditionLabel(listing)}
              </span>
              {listing.grading_company && (
                <span className="inline-flex items-center gap-1 rounded-md bg-grade-bg px-2.5 py-1 text-caption font-medium text-grade-text">
                  <BadgeCheck className="size-3.5" aria-hidden />
                  {listing.grading_company} Certified
                </span>
              )}
            </div>

            <p className="mt-4 text-display font-bold tabular">{php(listing.price)}</p>
            {listing.compare_price && listing.compare_price > listing.price && (
              <p className="text-caption text-text-secondary">
                Market <span className="tabular line-through">{php(listing.compare_price)}</span>
              </p>
            )}

            <div className="mt-5 hidden flex-col gap-2 lg:flex">
              <BuyActions listingId={listing.id} shopId={shop.id} />
            </div>

            <p className="mt-4 rounded-md bg-primary-subtle px-3 py-2 text-caption text-text-secondary">
              <span className="font-medium text-primary">Buyer Protection.</span>{" "}
              Covered for item-not-as-described with dispute support.
            </p>

            <ul className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
              <TrustIcon icon={ShieldCheck} label="100% Authentic" />
              <TrustIcon icon={Lock} label="Secure Checkout" />
              <TrustIcon icon={Truck} label="Fast Shipping" />
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-bg p-(--card-pad)">
            <div className="flex items-center gap-3">
              {shop.logo_url ? (
                <Image
                  src={shop.logo_url}
                  alt={shop.name}
                  width={36}
                  height={36}
                  className="size-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-subtle text-caption font-medium text-primary">
                  {shopInitials}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="truncate text-h3 font-semibold">{shop.name}</h2>
                <p className="text-caption text-text-secondary">
                  ★ {shop.rating} ({shop.review_count}) · {shop.location}
                </p>
              </div>
            </div>
            {shop.tier === "premium" && (
              <span className="mt-2 inline-block rounded-full bg-paid-bg px-2.5 py-0.5 text-caption font-medium text-paid">
                Premium Shop
              </span>
            )}

            {shop.description && (
              <div className="mt-3 border-t border-border pt-3">
                <h3 className="text-caption font-medium text-text-secondary">
                  About {shop.name}
                </h3>
                <p className="mt-1 text-body text-text-secondary">{shop.description}</p>
              </div>
            )}

            <Link
              href={`/shops/${shop.id}`}
              className="mt-3 flex h-11 items-center justify-center rounded-md border border-primary text-body font-medium text-primary transition-colors duration-(--duration-instant) hover:bg-primary-subtle"
            >
              Visit Store
            </Link>
          </div>

          <div className="rounded-lg border border-border bg-bg p-(--card-pad)">
            <div className="flex items-start gap-2">
              <HelpCircle className="mt-0.5 size-5 shrink-0 text-text-secondary" aria-hidden />
              <div>
                <h2 className="text-h3 font-semibold">Need Help?</h2>
                <p className="mt-1 text-body text-text-secondary">
                  Have a question about this card or your order? Our support team will be
                  reachable here soon.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: primary action pins above the tab bar rather than sitting
          below the fold. */}
      <div className="lg:hidden">
        <StickyActionBar>
          <div className="flex flex-col gap-2">
            <BuyActions listingId={listing.id} shopId={shop.id} />
          </div>
        </StickyActionBar>
        <StickyActionBarSpacer />
      </div>
    </AppShell>
  );
}

/** Add to Cart and Trade for This Card are both live. */
function BuyActions({ listingId, shopId }: { listingId: string; shopId: string }) {
  return (
    <>
      <form action={addToCart}>
        <input type="hidden" name="listingId" value={listingId} />
        <button className="h-11 w-full rounded-md bg-primary text-body font-medium text-white transition-all duration-(--duration-instant) hover:bg-primary-hover active:scale-[0.98]">
          Add to Cart
        </button>
      </form>
      <Link
        href={`/trade?want=${listingId}&shop=${shopId}`}
        className="flex h-11 w-full items-center justify-center rounded-md border border-primary text-body font-medium text-primary transition-transform duration-(--duration-instant) active:scale-[0.98]"
      >
        Trade for This Card
      </Link>
    </>
  );
}

function TrustIcon({
  icon: Icon,
  label,
}: {
  icon: typeof ShieldCheck;
  label: string;
}) {
  return (
    <li className="flex flex-col items-center gap-1 text-center">
      <Icon className="size-5 text-primary" aria-hidden />
      <span className="text-caption text-text-secondary">{label}</span>
    </li>
  );
}
