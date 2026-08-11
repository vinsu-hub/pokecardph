import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { VendorShell } from "@/components/vendor/VendorShell";
import { ScanStudio } from "@/components/vendor/ScanStudio";
import { cn } from "@/lib/utils";
import { primaryPhoto } from "@/lib/photos";

/**
 * Scan & Grade.
 * Reference: REFERENCE IMAGES/VENDOR SCAN OR UPLOAD ITEM.png
 *
 * Note the Listing Steps sidebar has FIVE steps here, not four: enabling the
 * scan inserts "Scan & Grade" as step 3. The canonical 4-step wizard is
 * therefore 4 without scanning and 5 with — a detail no spec document states,
 * discovered by reading this mockup.
 */
export const dynamic = "force-dynamic";

const LISTING_STEPS = [
  "Card Information",
  "Condition & Price",
  "Scan & Grade",
  "Photos & Description",
  "Preview",
];

export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/vendor/listings/${id}/scan`);
  if (!user.shopId) redirect("/vendor/onboarding");

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("id, shop_id, photos, scan_tier, cards(name, set_name)")
    .eq("id", id)
    .maybeSingle();

  if (!listing || listing.shop_id !== user.shopId) notFound();
  const card = listing.cards as unknown as { name: string; set_name: string } | null;

  // Flat tier is satisfied the moment a Front photo exists — no separate
  // upload here, that photo IS the flat scan. Full tier isn't set by this
  // page yet (the capture below is a state-machine shell; see ScanStudio's
  // own doc comment), so it can only already be true from a prior real scan.
  const flatTierSatisfied = primaryPhoto(listing.photos) !== null || listing.scan_tier !== null;

  return (
    <VendorShell shopName={user.shopName ?? "Your shop"}>
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* ---- Listing Steps rail ---- */}
        <aside>
          <Link
            href="/vendor/listings/add"
            className="flex h-11 items-center gap-2 rounded-md border border-border px-3 text-body font-medium"
          >
            ‹ Back to Add Listing
          </Link>

          <h2 className="mt-6 text-caption font-medium text-text-secondary uppercase">
            Listing Steps
          </h2>
          <ol className="mt-2 flex flex-col">
            {LISTING_STEPS.map((label, i) => {
              const done = i < 2;
              const active = i === 2;
              return (
                <li key={label}>
                  <span
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-md px-2 text-body",
                      active && "bg-primary-subtle font-medium text-primary-on-subtle",
                      !active && !done && "text-text-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full text-caption font-medium",
                        done || active ? "bg-primary text-white" : "border-2 border-border text-text-muted",
                      )}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>

          <section className="mt-6 rounded-lg border border-border bg-bg p-4">
            <h3 className="text-body font-medium">☆ Scan Tips</h3>
            <p className="mt-1 text-caption text-text-secondary">
              Use indirect lighting — no harsh glare. Move the card slowly and
              hold it steady.
            </p>
          </section>

          <section className="mt-4 rounded-lg border border-border bg-bg p-4">
            <h3 className="text-body font-medium">Need help?</h3>
            <span className="mt-1 block text-caption text-primary">
              View scanning guide ›
            </span>
          </section>
        </aside>

        {/* ---- Studio ---- */}
        <div>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-display font-bold">Scan &amp; Grade Your Card</h1>
              <p className="mt-1 text-body text-text-secondary">
                We&apos;ll capture multiple angles to analyse condition and estimate
                a grade{card ? ` for ${card.name}` : ""}.
              </p>
            </div>
            <span className="flex h-11 items-center rounded-md border border-border px-3 text-body">
              ⓘ Need help?
            </span>
          </header>

          <div className="mt-6">
            <ScanStudio onSkipHref={`/card/${id}`} flatTierSatisfied={flatTierSatisfied} />
          </div>
        </div>
      </div>
    </VendorShell>
  );
}
