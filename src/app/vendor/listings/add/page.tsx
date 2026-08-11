import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { VendorShell } from "@/components/vendor/VendorShell";
import { AddListingWizard } from "@/components/vendor/AddListingWizard";

export const dynamic = "force-dynamic";

async function publishListing(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vendor/listings/add");
  if (!user.shopId) redirect("/vendor/onboarding");

  const graded = String(formData.get("listingType")) === "graded";
  const status = String(formData.get("intent")) === "draft" ? "draft" : "active";

  // `photos` arrives as JSON from <ImageUpload>. The files are already in
  // Storage by this point — the browser uploaded them directly under the
  // bucket's policies — so this only records where they landed. A malformed
  // value must not cost the vendor the rest of the form, hence the fallback.
  let photos: { slot: string; url: string }[] = [];
  try {
    const raw = String(formData.get("photos") || "[]");
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      photos = parsed.filter(
        (p): p is { slot: string; url: string } =>
          typeof p === "object" && p !== null && typeof (p as { url?: unknown }).url === "string",
      );
    }
  } catch {
    photos = [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .insert({
      shop_id: user.shopId,
      card_id: String(formData.get("cardId")),
      listing_type: graded ? "graded" : "non_graded",
      grading_company: graded ? String(formData.get("gradingCompany") || "") || null : null,
      grade: graded ? String(formData.get("grade") || "") || null : null,
      cert_number: graded ? String(formData.get("certNumber") || "") || null : null,
      population: formData.get("population") ? Number(formData.get("population")) : null,
      price: Number(formData.get("price")),
      compare_price: formData.get("comparePrice") ? Number(formData.get("comparePrice")) : null,
      quantity: Number(formData.get("quantity") || 1),
      description: String(formData.get("description") || "") || null,
      photos,
      status,
      sale_type: "fixed",
      item_category: "card",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  redirect(status === "active" ? `/card/${data.id}` : "/vendor/listings?tab=draft");
}

export default async function AddListingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vendor/listings/add");
  if (!user.shopId) redirect("/vendor/onboarding");

  const supabase = await createClient();
  const { data: cards } = await supabase
    .from("cards")
    .select("id, name, set_name, card_number, rarity")
    .order("name");

  if (user.billingStatus === "restricted") {
    return (
      <VendorShell shopName={user.shopName ?? "Your shop"}>
        <RestrictedNotice />
      </VendorShell>
    );
  }

  return (
    <VendorShell shopName={user.shopName ?? "Your shop"}>
      <h1 className="text-display font-bold">Add New Listing</h1>
      <p className="mt-1 text-body text-text-secondary">
        List your card for sale and reach thousands of collectors.
      </p>
      <AddListingWizard
        action={publishListing}
        cards={cards ?? []}
        shopName={user.shopName ?? "Your shop"}
        shopId={user.shopId}
        draftId={crypto.randomUUID()}
      />
    </VendorShell>
  );
}

/**
 * A restricted shop (unpaid invoice past grace) cannot create new listings or
 * auctions. Existing live ones stay visible to buyers — the spec is explicit
 * that a vendor's unpaid bill must not punish buyers mid-purchase.
 */
function RestrictedNotice() {
  return (
    <div className="rounded-lg border border-danger-bg bg-danger-bg p-(--card-pad)">
      <h2 className="text-h3 font-semibold text-danger">Account restricted</h2>
      <p className="mt-1 text-body text-danger">
        Your account is restricted due to an unpaid invoice. Settle it to resume
        creating listings — your existing listings remain live for buyers.
      </p>
      <a href="/vendor/billing" className="mt-3 inline-flex h-11 items-center rounded-md bg-danger px-4 text-body font-medium text-white">
        Go to Billing
      </a>
    </div>
  );
}
