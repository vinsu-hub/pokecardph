import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { VendorShell } from "@/components/vendor/VendorShell";
import { StatusPill } from "@/components/shared/StatusPill";
import { php } from "@/lib/utils";
import { conditionLabel } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const TABS = ["all", "active", "draft", "sold", "removed"] as const;

const TONE = {
  active: "success", draft: "attention", sold: "paid", removed: "danger",
} as const;

async function setStatus(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user?.shopId) redirect("/vendor/onboarding");

  const supabase = await createClient();
  // RLS restricts this to the caller's own shop; the shop_id filter makes the
  // intent explicit rather than relying on the policy alone.
  await supabase
    .from("listings")
    .update({ status: String(formData.get("status")) })
    .eq("id", String(formData.get("id")))
    .eq("shop_id", user.shopId);
  revalidatePath("/vendor/listings");
}

export default async function VendorListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? sp.tab! : "all";

  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vendor/listings");
  if (!user.shopId) redirect("/vendor/onboarding");

  const supabase = await createClient();
  let q = supabase
    .from("listings")
    .select("*, cards(name, set_name, card_number)")
    .eq("shop_id", user.shopId)
    .eq("sale_type", "fixed")
    .order("created_at", { ascending: false });
  if (tab !== "all") q = q.eq("status", tab);

  const { data: listings } = await q;
  const { data: counts } = await supabase
    .from("listings")
    .select("status")
    .eq("shop_id", user.shopId)
    .eq("sale_type", "fixed");

  const countFor = (t: string) =>
    t === "all" ? counts?.length ?? 0 : (counts ?? []).filter((c) => c.status === t).length;

  return (
    <VendorShell shopName={user.shopName ?? "Your shop"} tier={user.shopTier} isBetaVendor={user.isBetaVendor}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display font-bold">Listings</h1>
        <Link
          href="/vendor/listings/add"
          className="flex h-11 items-center rounded-md bg-primary px-4 text-body font-medium text-white active:scale-[0.98]"
        >
          Add New Listing
        </Link>
      </header>

      <div className="mt-4 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/vendor/listings?tab=${t}`}
            className={`flex h-11 items-center gap-2 rounded-md px-4 text-body font-medium capitalize ${
              tab === t
                ? "bg-primary-subtle text-primary-on-subtle"
                : "border border-border bg-bg text-text-secondary hover:bg-bg-muted"
            }`}
          >
            {t}
            <span className="text-caption tabular opacity-70">{countFor(t)}</span>
          </Link>
        ))}
      </div>

      {(listings?.length ?? 0) === 0 ? (
        <p className="mt-6 rounded-lg border border-border bg-bg px-6 py-12 text-center text-body text-text-secondary">
          Nothing here yet.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {listings!.map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg p-4"
            >
              <div className="min-w-0">
                <Link href={`/card/${l.id}`} className="truncate text-body font-medium hover:text-primary">
                  {l.cards?.name ?? "Listing"}
                </Link>
                <p className="truncate text-caption text-text-secondary">
                  {l.cards?.set_name} · {conditionLabel(l)} · qty {l.quantity}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-body font-bold tabular">{php(Number(l.price))}</span>
                <StatusPill tone={TONE[l.status as keyof typeof TONE] ?? "info"}>
                  {l.status}
                </StatusPill>
                <Link
                  href={`/vendor/listings/${l.id}/scan`}
                  className="flex h-11 items-center rounded-md border border-border px-3 text-caption font-medium"
                >
                  Scan
                </Link>
                <form action={setStatus}>
                  <input type="hidden" name="id" value={l.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={l.status === "active" ? "removed" : "active"}
                  />
                  <button className="h-11 rounded-md border border-border px-3 text-caption font-medium">
                    {l.status === "active" ? "Unlist" : "Publish"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </VendorShell>
  );
}
