import Link from "next/link";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import {
  StickyActionBar,
  StickyActionBarSpacer,
} from "@/components/shared/StickyActionBar";
import { php, platformFee, shippingFee, FREE_SHIPPING_THRESHOLD } from "@/lib/utils";
import { conditionLabel } from "@/lib/supabase/types";
import { getCartDetail } from "@/lib/cart";
import { setQty, removeFromCart } from "@/lib/cart-actions";

/**
 * Cart. Line items grouped implicitly by shop, per the spec's cart-checkout
 * reference (which we don't have an image of — derived from MASTER_PROMPT §4).
 */
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const user = await getSessionUser();
  const detail = await getCartDetail();

  const subtotal = detail.reduce((s, d) => s + Number(d.listing.price) * d.line.qty, 0);
  const fee = platformFee(subtotal);
  const qualifiesForFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shipping = detail.length ? shippingFee(subtotal) : 0;
  const total = subtotal + fee + shipping;
  const amountToFreeShipping = FREE_SHIPPING_THRESHOLD - subtotal;

  return (
    <AppShell user={shellUser(user)} cartCount={detail.reduce((n, d) => n + d.line.qty, 0)}>
      <h1 className="text-display font-bold">Your Cart</h1>

      {detail.length === 0 ? (
        <div className="mt-6 rounded-lg border border-border bg-bg px-6 py-12 text-center">
          <p className="text-body text-text-secondary">Your cart is empty.</p>
          <Link
            href="/browse"
            className="mt-4 inline-flex h-11 items-center rounded-md bg-primary px-4 text-body font-medium text-white"
          >
            Browse cards
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <ul className="flex flex-col gap-3">
            {detail.map(({ line, listing }) => (
              <li
                key={listing.id}
                className="flex gap-3 rounded-lg border border-border bg-bg p-4"
              >
                <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-bg-muted">
                  <Art name={listing.cards.name} />
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/card/${listing.id}`} className="truncate text-body font-medium hover:text-primary">
                    {listing.cards.name}
                  </Link>
                  <p className="truncate text-caption text-text-secondary">
                    {listing.cards.set_name} · {conditionLabel(listing)}
                  </p>
                  <p className="truncate text-caption text-text-secondary">{listing.shops.name}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <form action={setQty} className="flex items-center gap-1">
                      <input type="hidden" name="listingId" value={listing.id} />
                      <label htmlFor={`q-${listing.id}`} className="sr-only">Quantity</label>
                      <input
                        id={`q-${listing.id}`}
                        name="qty"
                        type="number"
                        min={1}
                        defaultValue={line.qty}
                        className="h-11 w-16 rounded-md border border-border px-2 text-body tabular"
                      />
                      <button className="h-11 rounded-md border border-border px-3 text-caption font-medium">
                        Update
                      </button>
                    </form>
                    <form action={removeFromCart}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <button className="h-11 rounded-md px-3 text-caption font-medium text-danger">
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
                <p className="shrink-0 text-body font-bold tabular">
                  {php(Number(listing.price) * line.qty)}
                </p>
              </li>
            ))}
          </ul>

          <aside className="flex flex-col gap-3">
            <div className="rounded-lg border border-border bg-bg p-(--card-pad)">
              <h2 className="text-h3 font-semibold">Order Summary</h2>
              <dl className="mt-3 flex flex-col gap-2">
                <Row label="Subtotal" value={php(subtotal)} />
                <Row
                  label="Shipping"
                  value={qualifiesForFreeShipping ? "Free" : php(shipping)}
                />
                <Row label="Platform fee" value={php(fee)} />
                <div className="mt-1 flex items-center justify-between border-t border-border pt-3">
                  <dt className="text-body font-medium">Total</dt>
                  <dd className="text-h3 font-bold tabular">{php(total)}</dd>
                </div>
              </dl>
              <Link
                href="/checkout"
                className="mt-4 hidden h-11 items-center justify-center rounded-md bg-primary text-body font-medium text-white lg:flex"
              >
                Proceed to Checkout
              </Link>
            </div>

            {/* Reference: REFERENCE IMAGES/BUYER CART.png. ₱10,000 is the
                mockup's own number, not a sourced business rule — the
                shipping calculation above honors the same constant, so this
                is never a bar that promises something checkout doesn't do. */}
            <div className="rounded-lg border border-border bg-bg p-4">
              {qualifiesForFreeShipping ? (
                <p className="flex items-center gap-2 text-caption font-medium text-success">
                  <TruckIcon />
                  You&apos;ve unlocked free shipping!
                </p>
              ) : (
                <>
                  <p className="flex items-center gap-2 text-caption text-text-secondary">
                    <TruckIcon />
                    You&apos;re{" "}
                    <span className="font-medium text-text-primary">{php(amountToFreeShipping)}</span>{" "}
                    away from free shipping
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%`,
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            <p className="rounded-md bg-primary-subtle px-3 py-2 text-caption text-text-secondary">
              <span className="font-medium text-primary">Buyer Protection.</span> Covered for
              item-not-as-described with dispute support.
            </p>
          </aside>

          <div className="lg:hidden">
            <StickyActionBar>
              <Link
                href="/checkout"
                className="flex h-11 items-center justify-center rounded-md bg-primary text-body font-medium text-white"
              >
                Checkout · {php(total)}
              </Link>
            </StickyActionBar>
            <StickyActionBarSpacer />
          </div>
        </div>
      )}
    </AppShell>
  );
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M2 6h9v8H2z" strokeLinejoin="round" />
      <path d="M11 9h4l3 3v2h-7z" strokeLinejoin="round" />
      <circle cx="5.5" cy="15" r="1.5" />
      <circle cx="14.5" cy="15" r="1.5" />
    </svg>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-body text-text-secondary">{label}</dt>
      <dd className="text-body tabular">{value}</dd>
    </div>
  );
}

function Art({ name }: { name: string }) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return (
    <div
      className="absolute inset-0"
      style={{ background: `linear-gradient(150deg, hsl(${h} 70% 88%), hsl(${(h + 40) % 360} 65% 78%))` }}
    />
  );
}
