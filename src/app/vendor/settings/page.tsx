import Link from "next/link";
import { redirect } from "next/navigation";
import {
  TrendingUp, Gavel, ShieldCheck, Megaphone, Search, Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { VendorShell } from "@/components/vendor/VendorShell";
import { StatusPill } from "@/components/shared/StatusPill";
import { ImageUpload } from "@/components/shared/ImageUpload";

/**
 * Shop Settings — the nav slot `VendorShell.tsx` reserved as disabled since
 * it was built. Three sections: edit the shop's own identity (name/location/
 * description/logo/banner — no update path existed anywhere before this),
 * a "What Premium unlocks" showcase for the business model's not-yet-built
 * revenue streams, and Sign Out (buyer side already has one; vendor side
 * didn't).
 *
 * No reference image exists for this screen — built to the same vendor-shell
 * layout every other vendor page uses, not a new pattern.
 */
export const dynamic = "force-dynamic";

const PREMIUM_FEATURES = [
  {
    icon: TrendingUp,
    title: "Featured & Boosted Listings",
    description: "Get placement in the home grid and at the top of search results.",
  },
  {
    icon: Gavel,
    title: "Priority Auction Slotting",
    description: "Start an auction with higher visibility than standard fixed-price listings.",
  },
  {
    icon: Sparkles,
    title: "Verified Condition Scan",
    description: "Upgrade Flat Scan to a full photometric scan for a Platform Verified Condition badge.",
  },
  {
    icon: ShieldCheck,
    title: "Protected Trade",
    description: "Add in-app meetup verification for extra buyer confidence on trades.",
  },
  {
    icon: Megaphone,
    title: "News Feed Sponsored Listing",
    description: "Feature your shop's event or announcement in the community News Feed.",
  },
  {
    icon: Search,
    title: "Sponsored Search Placement",
    description: "Bid for top ranking when buyers search for specific cards.",
  },
];

async function updateShopDetails(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vendor/settings");
  if (!user.shopId) redirect("/vendor/onboarding");

  // <ImageUpload>'s hidden field is "[]" unless a new file was picked this
  // session — only overwrite logo_url/banner_url when a real upload
  // happened, so saving the rest of the form never blanks out an existing
  // image the vendor didn't touch.
  function firstUploadUrl(fieldName: string): string | undefined {
    try {
      const parsed: unknown = JSON.parse(String(formData.get(fieldName) || "[]"));
      if (Array.isArray(parsed) && parsed.length > 0) {
        const url = (parsed[0] as { url?: unknown }).url;
        if (typeof url === "string") return url;
      }
    } catch {
      // malformed input — leave the existing image alone rather than erroring
    }
    return undefined;
  }

  const logoUrl = firstUploadUrl("logo");
  const bannerUrl = firstUploadUrl("banner");

  const update: Record<string, unknown> = {
    name: String(formData.get("name") || "").trim(),
    location: String(formData.get("location") || "").trim() || null,
    description: String(formData.get("description") || "").trim() || null,
  };
  if (logoUrl) update.logo_url = logoUrl;
  if (bannerUrl) update.banner_url = bannerUrl;

  const supabase = await createClient();
  // shops_vendor_write RLS (vendor_id = auth.uid()) is the real boundary —
  // this .eq is belt-and-suspenders, not the security check itself.
  const { error } = await supabase.from("shops").update(update).eq("id", user.shopId);
  if (error) throw new Error(error.message);

  redirect("/vendor/settings?saved=1");
}

export default async function VendorSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vendor/settings");
  if (!user.shopId) redirect("/vendor/onboarding");

  const supabase = await createClient();
  const { data: shop } = await supabase
    .from("shops")
    .select("id, name, location, description, logo_url, banner_url, tier")
    .eq("id", user.shopId)
    .maybeSingle();

  if (!shop) redirect("/vendor/onboarding");

  return (
    <VendorShell shopName={user.shopName ?? "Your shop"} tier={user.shopTier} isBetaVendor={user.isBetaVendor}>
      <h1 className="text-display font-bold">Shop Settings</h1>
      <p className="mt-1 text-body text-text-secondary">
        Manage your shop&apos;s identity, see what Premium unlocks, and sign out.
      </p>

      {sp.saved === "1" && (
        <p className="mt-4 rounded-md bg-success-bg px-3 py-2 text-body text-success">
          Shop details saved.
        </p>
      )}

      {/* ---- Edit Shop Details ---- */}
      <section className="mt-6 rounded-lg border border-border bg-bg p-(--card-pad)">
        <h2 className="text-h2 font-semibold">Edit Shop Details</h2>
        <form action={updateShopDetails} className="mt-4 flex flex-col gap-4">
          <Field label="Shop name" htmlFor="name">
            <input
              id="name" name="name" required defaultValue={shop.name}
              className="h-11 w-full rounded-md border border-border bg-bg px-3 text-body"
            />
          </Field>
          <Field label="Location" htmlFor="location">
            <input
              id="location" name="location" defaultValue={shop.location ?? ""}
              placeholder="e.g. Cubao, Quezon City"
              className="h-11 w-full rounded-md border border-border bg-bg px-3 text-body"
            />
          </Field>
          <Field label="Description" htmlFor="description">
            <textarea
              id="description" name="description" rows={3} defaultValue={shop.description ?? ""}
              placeholder="Tell buyers what your shop is about…"
              className="w-full rounded-md border border-border p-3 text-body"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-body font-medium">Shop logo</p>
              {shop.logo_url && (
                <div className="mt-2 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shop.logo_url} alt="Current logo" className="size-12 rounded-full object-cover" />
                  <span className="text-caption text-text-secondary">Current logo</span>
                </div>
              )}
              <div className="mt-2">
                <ImageUpload name="logo" bucket="shop-assets" prefix={shop.id} slots={["Logo"]} />
              </div>
            </div>
            <div>
              <p className="text-body font-medium">Shop banner</p>
              {shop.banner_url && (
                <div className="mt-2 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shop.banner_url} alt="Current banner" className="h-12 w-20 rounded-md object-cover" />
                  <span className="text-caption text-text-secondary">Current banner</span>
                </div>
              )}
              <div className="mt-2">
                <ImageUpload name="banner" bucket="shop-assets" prefix={shop.id} slots={["Banner"]} />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="h-11 self-start rounded-md bg-primary px-6 text-body font-medium text-white transition-colors duration-(--duration-instant) hover:bg-primary-hover"
          >
            Save Changes
          </button>
        </form>
      </section>

      {/* ---- What Premium unlocks ---- */}
      <section className="mt-6 rounded-lg border border-border bg-bg p-(--card-pad)">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-h2 font-semibold">What Premium unlocks</h2>
          <p className="text-caption text-text-secondary">
            You&apos;re on the <span className="font-medium capitalize">{shop.tier ?? "free"}</span> plan
            {" — "}
            <Link href="/vendor/billing" className="text-primary">manage billing</Link>
          </p>
        </div>
        <p className="mt-1 text-body text-text-secondary">
          Upcoming ways to grow your shop&apos;s reach on PokeCard PH.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PREMIUM_FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-md border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-full bg-primary-subtle text-primary">
                  <Icon className="size-4.5" />
                </span>
                <StatusPill tone="neutral">Coming Soon</StatusPill>
              </div>
              <p className="mt-3 text-body font-medium">{title}</p>
              <p className="mt-1 text-caption text-text-secondary">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Account ---- */}
      <section className="mt-6 rounded-lg border border-border bg-bg p-(--card-pad)">
        <h2 className="text-h2 font-semibold">Account</h2>
        <p className="mt-1 text-body text-text-secondary">Signed in as a vendor of {shop.name}.</p>
        {/* Low-stakes and reversible — no confirmation modal, matching the
            buyer-side account menu's sign-out (AppShell.tsx). */}
        <form action="/auth/signout" method="post" className="mt-3">
          <button
            type="submit"
            className="h-11 rounded-md border border-border px-6 text-body font-medium text-danger transition-colors duration-(--duration-instant) hover:bg-bg-muted"
          >
            Sign Out
          </button>
        </form>
      </section>
    </VendorShell>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-body font-medium">{label}</label>
      {children}
    </div>
  );
}
