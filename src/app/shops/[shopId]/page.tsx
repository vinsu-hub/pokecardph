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
 * Shelf-style rows (Featured / Graded / Booster Packs) rather than one flat
 * grid; that shelving is what the storefront animation spec orchestrates.
 */
export const dynamic = "force-dynamic";

export default async function ShopPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = await params;
  const supabase = await createClient();
  const user = await getSessionUser();
  const cartCount = await getCartCount();

  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("id", shopId)
    .maybeSingle();
  if (!shop) notFound();

  const { data } = await supabase
    .from("listings")
    .select("*, cards(*), shops(*)")
    .eq("shop_id", shopId)
    .eq("status", "active")
    .eq("sale_type", "fixed")
    .order("price", { ascending: false });

  const listings = (data ?? []) as unknown as ListingCard[];
  const graded = listings.filter((l) => l.listing_type === "graded");
  const raw = listings.filter((l) => l.listing_type === "non_graded");
  const featured = listings.slice(0, 6);

  const stats = [
    ["Sales", `${shop.review_count * 4}+`],
    ["Positive Feedback", "98%"],
    ["Avg. Response", "2h"],
    ["Shop Rating", `${shop.rating}★`],
  ];

  return (
    <AppShell user={shellUser(user)} cartCount={cartCount}>
      {/* ---- Shop header ---- */}
      <header className="rounded-lg border border-border bg-primary-subtle p-(--card-pad)">
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
              {new Date(shop.joined_at).toLocaleDateString("en-PH", {
                year: "numeric", month: "long",
              })}
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
      </header>

      {listings.length === 0 ? (
        <p className="mt-6 rounded-lg border border-border bg-bg px-6 py-12 text-center text-body text-text-secondary">
          This shop has no active listings right now.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          <Shelf title="Featured Cards" listings={featured} />
          {graded.length > 0 && <Shelf title="Graded Cards" listings={graded} />}
          {raw.length > 0 && <Shelf title="Non-Graded Cards" listings={raw} />}
        </div>
      )}
    </AppShell>
  );
}

/**
 * A shelf row. Scrolls horizontally inside its own container — the page body
 * itself never scrolls sideways, which is the hard rule.
 */
function Shelf({ title, listings }: { title: string; listings: ListingCard[] }) {
  return (
    <section>
      <h2 className="text-h2 font-semibold">{title}</h2>
      <ul className="mt-3 flex gap-4 overflow-x-auto pb-2">
        {listings.map((l) => (
          <li key={l.id} className="w-[160px] shrink-0 sm:w-[200px]">
            <ListingCardTile listing={l} />
          </li>
        ))}
      </ul>
    </section>
  );
}
