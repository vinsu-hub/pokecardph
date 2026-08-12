import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * The one place a `shops` row gets created. Standard onboarding (60-day
 * trial) and beta signup (90-day trial, is_beta_vendor) both call this so the
 * row shape can never drift between the two paths, and trial_ends_at is
 * always set explicitly — it has no column default, so leaving it off the
 * insert (the previous behavior) silently produced NULL, which made shops
 * invisible to the trial-reminder and invoicing jobs.
 */
export async function createShopForVendor(params: {
  vendorId: string;
  name: string;
  location: string | null;
  trialDays: number;
  isBetaVendor: boolean;
}): Promise<{ error: string | null }> {
  const { vendorId, name, location, trialDays, isBetaVendor } = params;
  const supabase = await createClient();
  const now = new Date();

  const { error } = await supabase.from("shops").insert({
    vendor_id: vendorId,
    name,
    location,
    tier: "free",
    trial_ends_at: new Date(now.getTime() + trialDays * 86_400_000).toISOString(),
    onboarded_at: now.toISOString(),
    is_beta_vendor: isBetaVendor,
    beta_registered_at: isBetaVendor ? now.toISOString() : null,
  });
  if (error) return { error: error.message };

  // profiles.role becomes 'vendor' only here — never at signup.
  await supabase.from("profiles").update({ role: "vendor" }).eq("id", vendorId);
  return { error: null };
}
