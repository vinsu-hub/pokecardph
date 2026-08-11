import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import {
  StickyActionBar,
  StickyActionBarSpacer,
} from "@/components/shared/StickyActionBar";
import { php } from "@/lib/utils";
import { conditionLabel, type ListingCard } from "@/lib/supabase/types";
import { addToCart, getCartCount } from "@/lib/cart";

/**
 * Card Detail (2D).
 *
 * NO REFERENCE IMAGE EXISTS for this screen — `ITEM VIEW WITH 3D MODEL
 * VIEW.png` is the Phase 7 3D Inspection page, a different layout entirely.
 * Derived from MASTER_PROMPT.md §4 (1.2), taking card/badge/typography
 * treatment from SHOP PAGE.png and VENDOR STORE VIEW.png so it reads as the
 * same product.
 *
 * Deliberately NOT built (unspecced mockup features, raised not dropped):
 * AR View, the Market Price comparison widget, Pop. Higher, Add to Watchlist.
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

  const specs: [string, string | null][] = [
    ["Grading Company", listing.grading_company],
    ["Card Grade", listing.grade],
    ["Cert Number", listing.cert_number],
    ["Population", listing.population ? String(listing.population) : null],
    ["Language", card.language],
    ["Set", card.set_name],
    ["Card Number", card.card_number],
    ["Rarity", card.rarity],
  ];

  return (
    <AppShell user={shellUser(user)} cartCount={cartCount}>
      <nav className="mb-4 text-caption text-text-secondary">
        <Link href="/" className="hover:text-text-primary">Home</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/shops/${shop.id}`} className="hover:text-text-primary">{shop.name}</Link>
        <span className="mx-1.5">›</span>
        <span className="text-text-primary">{card.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* ---------------- Image panel ---------------- */}
        <div>
          <div className="flex gap-2">
            <span className="rounded-md bg-primary px-3 py-1.5 text-caption font-medium text-white">
              2D View
            </span>
            {/* Phase 7. Present so the affordance is discoverable, disabled so
                it can't lie about what exists. */}
            <span
              title="3D inspection arrives in a later release"
              className="cursor-not-allowed rounded-md border border-border px-3 py-1.5 text-caption font-medium text-text-muted"
            >
              3D View
            </span>
          </div>

          <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-lg border border-border">
            <span className="absolute top-3 left-3 z-10 rounded-md bg-primary px-2.5 py-1 text-caption font-medium text-white">
              {conditionLabel(listing)}
            </span>
            <CardArt name={card.name} />
          </div>

          <section className="mt-6 rounded-lg border border-border bg-bg p-(--card-pad)">
            <h2 className="text-h3 font-semibold">About this card</h2>
            <p className="mt-2 text-body text-text-secondary">
              {listing.description ??
                "No additional description provided by the vendor."}
            </p>
            {listing.condition_notes && (
              <p className="mt-3 text-body text-text-secondary">
                <span className="font-medium text-text-primary">Condition notes: </span>
                {listing.condition_notes}
              </p>
            )}
          </section>
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

            <p className="mt-4 text-display font-bold tabular">{php(listing.price)}</p>
            {listing.compare_price && listing.compare_price > listing.price && (
              <p className="text-caption text-text-secondary">
                Market <span className="tabular line-through">{php(listing.compare_price)}</span>
              </p>
            )}

            <dl className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              {specs
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-4">
                    <dt className="text-caption text-text-secondary">{k}</dt>
                    <dd className="text-body">{v}</dd>
                  </div>
                ))}
            </dl>

            <div className="mt-5 hidden flex-col gap-2 lg:flex">
              <BuyActions listingId={listing.id} shopId={shop.id} />
            </div>

            <p className="mt-4 rounded-md bg-primary-subtle px-3 py-2 text-caption text-text-secondary">
              <span className="font-medium text-primary">Buyer Protection.</span>{" "}
              Covered for item-not-as-described with dispute support.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-bg p-(--card-pad)">
            <h2 className="text-h3 font-semibold">{shop.name}</h2>
            <p className="mt-1 text-caption text-text-secondary">
              ★ {shop.rating} ({shop.review_count}) · {shop.location}
            </p>
            {shop.tier === "premium" && (
              <span className="mt-2 inline-block rounded-full bg-paid-bg px-2.5 py-0.5 text-caption font-medium text-paid">
                Premium Shop
              </span>
            )}
            <Link
              href={`/shops/${shop.id}`}
              className="mt-3 flex h-11 items-center justify-center rounded-md border border-border text-body font-medium"
            >
              View Shop
            </Link>
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

function CardArt({ name }: { name: string }) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return (
    <div
      className="absolute inset-0 grid place-items-center p-6 text-center"
      style={{
        background: `linear-gradient(150deg, hsl(${h} 70% 88%), hsl(${(h + 40) % 360} 65% 78%))`,
      }}
    >
      <span className="text-h2 font-semibold text-text-primary/50">{name}</span>
    </div>
  );
}
