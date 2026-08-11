import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shared/AppShell";
import { shellUser } from "@/lib/auth";

/**
 * Minimal vendor onboarding. Not in any reference image — the Phase 2 spec
 * says to build "a simple 1-page form", so this is that.
 *
 * Exists this phase because a signed-in user needs a `shops` row before they
 * can receive a trade proposal or host an auction. The fuller onboarding
 * (logo upload, banner, verification) belongs to the vendor core loop.
 */
export const dynamic = "force-dynamic";

async function createShop(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vendor/onboarding");
  if (user.shopId) redirect("/vendor/trade-requests");

  const name = String(formData.get("name") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("shops")
    .insert({ vendor_id: user.id, name, location: location || null, tier: "free" });
  if (error) throw new Error(error.message);

  // profiles.role becomes 'vendor' only here — never at signup.
  await supabase.from("profiles").update({ role: "vendor" }).eq("id", user.id);

  redirect("/vendor/trade-requests");
}

export default async function VendorOnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vendor/onboarding");
  if (user.shopId) redirect("/vendor/trade-requests");

  return (
    <AppShell user={shellUser(user)}>
      <div className="mx-auto max-w-[520px]">
        <h1 className="text-display font-bold">Open your shop</h1>
        <p className="mt-1 text-body text-text-secondary">
          One step to start listing, trading, and hosting auctions.
        </p>

        <form
          action={createShop}
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
