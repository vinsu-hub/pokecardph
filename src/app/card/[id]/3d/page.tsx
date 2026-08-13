import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { Inspector3D } from "@/components/buyer/Inspector3D";
import { getCartCount } from "@/lib/cart";
import { addToCart } from "@/lib/cart-actions";
import { php } from "@/lib/utils";
import { conditionLabel, type ListingCard } from "@/lib/supabase/types";
import { primaryPhoto, testBackFor, testNormalMapFor } from "@/lib/photos";
import { ShopInfoCard } from "@/components/buyer/ShopInfoCard";

/**
 * 3D Inspection.
 * Reference: REFERENCE IMAGES/ITEM VIEW WITH 3D MODEL VIEW.png
 *
 * A separate page from Card Detail, which is what the mockup actually shows —
 * dark viewer, angle filmstrip, lighting presets, and a right rail of Card
 * Information / Market Price / Actions.
 *
 * Two things in the mockup are deliberately absent, since neither appears in
 * any spec or schema: the AR View button, and the Market Price comparison
 * widget (which implies a price-history source nobody has scoped). Population
 * IS shown because listings carries it; "Pop. Higher" is not.
 */
export const dynamic = "force-dynamic";

export default async function Inspect3DPage({
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

  // A vendor's own photo of this exact item outranks the catalog's stock
  // image of the card, same rule as Card Detail's hero.
  const albedo = primaryPhoto(listing.photos) ?? card?.image_url ?? null;
  const normal = testNormalMapFor(albedo);
  const backAlbedo = testBackFor(albedo);

  const specs: [string, string | null][] = [
    ["Name", card?.name ?? null],
    ["Set", card ? `${card.set_name}${card.card_number ? ` ${card.card_number}` : ""}` : null],
    ["Rarity", card?.rarity ?? null],
    ["Grade", listing.grade ? `${listing.grading_company ?? ""} ${listing.grade}`.trim() : null],
    ["Cert Number", listing.cert_number],
    ["Population", listing.population ? String(listing.population) : null],
    ["Language", card?.language ?? null],
  ];

  return (
    <AppShell user={shellUser(user)} cartCount={cartCount}>
      <Link href={`/card/${id}`} className="inline-flex h-11 items-center text-caption text-primary">
        ← Back to card
      </Link>

      <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-h2 font-semibold">3D Inspection</h1>
              <p className="text-body text-text-secondary">
                {card?.name}
                {listing.grade && (
                  <span className="ml-2 rounded-md bg-primary-subtle px-2 py-0.5 text-caption font-medium text-primary">
                    {conditionLabel(listing)}
                  </span>
                )}
              </p>
            </div>
            <span className="flex h-11 items-center rounded-md bg-primary px-4 text-body font-medium text-white">
              ⟳ Rotate
            </span>
          </header>

          <Inspector3D
            name={card?.name ?? "Card"}
            albedo={albedo}
            normal={normal}
            backAlbedo={backAlbedo}
            scanTier={listing.scan_tier}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
            <h2 className="text-h3 font-semibold">Card Information</h2>
            <dl className="mt-3 flex flex-col gap-2">
              {specs.filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4">
                  <dt className="text-caption text-text-secondary">{k}</dt>
                  <dd className="text-body">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
            <h2 className="text-h3 font-semibold">Actions</h2>
            <p className="mt-2 text-display font-bold tabular">{php(Number(listing.price))}</p>
            <form action={addToCart} className="mt-3">
              <input type="hidden" name="listingId" value={listing.id} />
              <button className="h-11 w-full rounded-md bg-primary text-body font-medium text-white transition-transform duration-(--duration-instant) active:scale-[0.98]">
                Add to Cart
              </button>
            </form>
            <Link
              href={`/trade?want=${listing.id}&shop=${shop.id}`}
              className="mt-2 flex h-11 w-full items-center justify-center rounded-md border border-primary text-body font-medium text-primary"
            >
              Trade for This Card
            </Link>
          </section>

          <ShopInfoCard shop={shop} />

          {!albedo && (
            <p className="rounded-md bg-attention-bg px-3 py-2 text-caption text-attention">
              This listing has no photo yet, so there is no surface to show.
            </p>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
