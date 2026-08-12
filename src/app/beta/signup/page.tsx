import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createShopForVendor } from "@/lib/shop-signup";
import { AppShell } from "@/components/shared/AppShell";
import { shellUser } from "@/lib/auth";

/**
 * Beta signup — same two fields and guard order as standard vendor
 * onboarding (src/app/vendor/onboarding/page.tsx) on purpose, so a future
 * reader sees two nearly-identical files rather than reverse-engineering why
 * they differ. Protected by middleware.ts's PROTECTED array (unlike /beta
 * itself, which stays public).
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

  const name = String(formData.get("name") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  if (!name) return;

  const { error } = await createShopForVendor({
    vendorId: user.id,
    name,
    location: location || null,
    trialDays: config!.trial_days,
    isBetaVendor: true,
  });
  if (error) throw new Error(error);

  redirect("/vendor/dashboard?beta=welcome");
}

export default async function BetaSignupPage() {
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
      <div className="mx-auto max-w-[520px]">
        <h1 className="text-display font-bold">Apply as a {cohortName}</h1>
        <p className="mt-1 text-body text-text-secondary">
          One step to start listing, trading, and hosting auctions — free for {trialDays} days,
          no GMV cap.
        </p>

        <form
          action={registerBetaVendor}
          className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-bg p-(--card-pad)"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-body font-medium">Shop name</label>
            <input
              id="name" name="name" required maxLength={60}
              placeholder="e.g. Foil &amp; Flame Cards"
              className="h-11 rounded-md border border-border px-3 text-body outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="location" className="text-body font-medium">Location</label>
            <input
              id="location" name="location" placeholder="e.g. Quezon City, PH"
              className="h-11 rounded-md border border-border px-3 text-body outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-md bg-primary text-body font-medium text-white transition-transform duration-(--duration-instant) active:scale-[0.98]"
          >
            Create shop
          </button>
        </form>
      </div>
    </AppShell>
  );
}
