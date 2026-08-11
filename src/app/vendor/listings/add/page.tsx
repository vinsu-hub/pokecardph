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
      />
    </VendorShell>
  );
}
