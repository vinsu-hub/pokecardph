import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shared/AppShell";
import { shellUser } from "@/lib/auth";
import { BetaSignupForm } from "@/components/beta/BetaSignupForm";

/**
 * Beta signup — instant activation. Reference: REFERENCE IMAGES/VENDOR
 * REGISTRATION BETA.png — a 4-step wizard (Your Information / Shop Details /
 * Review & Submit / Start Listing) where step 4 is a redirect into the real
 * Add Listing wizard (REFERENCE IMAGES/VENDOR ADD NEW LISTING VIEW.png),
 * not a form screen of its own. The shop is created and the trial starts the
 * instant step 3 submits — no application/approval step.
 *
 * Protected by middleware.ts's PROTECTED array (unlike /beta itself, which
 * stays public); any signed-in method (Google or magic-link) reaches this
 * page, matching the app's one-shared-auth-flow convention rather than
 * gating on Google specifically — so step 1 has no inline Google button of
 * its own, unlike the reference image.
 *
 * The single-insert shape of standard onboarding (createShopForVendor) isn't
 * reused here — this flow needs shop creation and the role flip to commit
 * atomically as one unit, so it calls the register_beta_vendor_instant()
 * Postgres RPC (0021_beta_instant_activation.sql) instead.
 * createShopForVendor() remains the standard-onboarding path, unchanged.
 */
export const dynamic = "force-dynamic";

async function registerBetaVendor(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/beta/signup");
  if (user.shopId) redirect("/vendor/dashboard");

  const supabase = await createClient();
  const { data: config } = await supabase
    .from("beta_program_config")
    .select("*")
    .eq("id", true)
    .maybeSingle();

  const now = new Date();
  const isOpen = !!config && now >= new Date(config.window_start) && now < new Date(config.window_end);

  // The window can close between page render and form submit (a tab left
  // open past window_end) — re-check here, at the point of insert, rather
  // than trusting the page-render check alone.
  if (!isOpen) redirect("/vendor/onboarding?closed=beta");
  // `config` is guaranteed non-null past this point — captured into a plain
  // variable (not a `config!` assertion later) so a future edit can't
  // reorder the RPC call ahead of the isOpen guard without TypeScript
  // complaining about a missing value.
  const trialDays = config.trial_days;

  const fullName = String(formData.get("fullName") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const vendorType = String(formData.get("vendorType") ?? "").trim() || null;
  const socialHandle = String(formData.get("socialHandle") ?? "").trim() || null;
  const howHeard = String(formData.get("howHeard") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!name || !location) {
    redirect("/beta/signup?error=" + encodeURIComponent("Shop name and location are required."));
  }

  const { data, error } = await supabase.rpc("register_beta_vendor_instant", {
    p_name: name,
    p_location: location,
    p_vendor_type: vendorType,
    p_social_handle: socialHandle,
    p_how_heard: howHeard,
    p_phone: phone,
    p_trial_days: trialDays,
  });

  const result = data as { ok: boolean; error?: string; shop_id?: string } | null;
  if (error || !result?.ok) {
    redirect("/beta/signup?error=" + encodeURIComponent(result?.error ?? error?.message ?? "Something went wrong — try again."));
  }

  // Full Name is editable on step 1 (prefilled from the Google/magic-link
  // profile, but the vendor may correct it) — keep profiles.display_name in
  // sync with whatever they actually submitted.
  if (fullName && fullName !== user.displayName) {
    await supabase.from("profiles").update({ display_name: fullName }).eq("id", user.id);
  }

  redirect("/vendor/listings/add?beta=welcome");
}

export default async function BetaSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/beta/signup");
  if (user.shopId) redirect("/vendor/dashboard");

  const supabase = await createClient();
  const { data: config } = await supabase
    .from("beta_program_config")
    .select("*")
    .eq("id", true)
    .maybeSingle();

  const now = new Date();
  const isOpen = !!config && now >= new Date(config.window_start) && now < new Date(config.window_end);
  if (!isOpen) redirect("/vendor/onboarding");

  const cohortName = config?.cohort_name ?? "Founding Vendor";
  const trialDays = config?.trial_days ?? 90;

  return (
    <AppShell user={shellUser(user)}>
      <div className="mx-auto max-w-[720px]">
        <h1 className="text-display font-bold">Welcome to PokeCard PH Beta</h1>
        <p className="mt-1 text-body text-text-secondary">
          Create your shop and start listing — free for {trialDays} days as a {cohortName}, no
          GMV cap, no ID required.
        </p>

        <BetaSignupForm
          action={registerBetaVendor}
          fullName={user.displayName ?? ""}
          email={user.email}
          errorMessage={sp.error}
        />
      </div>
    </AppShell>
  );
}
