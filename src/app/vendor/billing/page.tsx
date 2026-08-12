import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { VendorShell } from "@/components/vendor/VendorShell";
import { StatusPill } from "@/components/shared/StatusPill";
import { php } from "@/lib/utils";

/**
 * Vendor Billing.
 *
 * No reference image exists — built to PHASE5_MONETIZATION.md §6 in the
 * established visual language.
 *
 * The billing maths is real: GMV, tier resolution, growth surcharge and amount
 * due all come from the database. What is NOT real is payment — Xendit isn't
 * provisioned, so no invoice is payable. The page says that plainly rather
 * than showing a dead Pay Now button.
 */
export const dynamic = "force-dynamic";

const BILLING_TONE = {
  waived_trial: "info",
  pending: "attention",
  invoiced: "info",
  paid: "success",
  overdue: "danger",
} as const;

export default async function BillingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vendor/billing");
  if (!user.shopId) redirect("/vendor/onboarding");

  const supabase = await createClient();
  const shopId = user.shopId;
  const period = new Date();
  const periodKey = new Date(
    Date.UTC(period.getUTCFullYear(), period.getUTCMonth(), 1),
  ).toISOString().slice(0, 10);

  const [{ data: shop }, { data: tiers }, { data: gmvRows }, { data: invoices }, { data: payouts }] =
    await Promise.all([
      supabase.from("shops").select("*").eq("id", shopId).maybeSingle(),
      supabase.from("billing_tiers").select("*").eq("active", true).order("min_gmv"),
      supabase.from("vendor_gmv_history").select("*").eq("shop_id", shopId).order("period", { ascending: false }),
      supabase.from("vendor_monthly_billing").select("*").eq("shop_id", shopId).order("period_start", { ascending: false }),
      supabase.from("vendor_payouts").select("*").eq("shop_id", shopId).order("created_at", { ascending: false }),
    ]);

  const currentGmv = Number(
    (gmvRows ?? []).find((r) => r.period === periodKey)?.gmv ?? 0,
  );

  const { data: projected } = await supabase.rpc("resolve_billing", { gmv: currentGmv });
  const projectedFee = Number(projected ?? 0);

  const { inTrial, daysLeft } = trialState(shop?.billing_status, shop?.trial_ends_at);

  const cap = Number(shop?.trial_gmv_cap ?? 0);
  const capPct = cap > 0 ? Math.min(100, Math.round((currentGmv / cap) * 100)) : 0;

  const currentTier = (tiers ?? []).find(
    (t) => currentGmv >= Number(t.min_gmv) && (t.max_gmv == null || currentGmv <= Number(t.max_gmv)),
  );

  return (
    <VendorShell shopName={user.shopName ?? "Your shop"} tier={shop?.tier} isBetaVendor={shop?.is_beta_vendor}>
      <h1 className="text-display font-bold">Billing</h1>
      <p className="mt-1 text-body text-text-secondary">
        Your subscription scales with what you sell, not a flat per-seat fee.
      </p>

      <p className="mt-4 rounded-md bg-attention-bg px-3 py-2 text-caption text-attention">
        Payment processing isn&apos;t connected yet — Xendit credentials aren&apos;t
        provisioned. Amounts below are calculated for real; no invoice is payable.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Trial or current tier */}
        {inTrial ? (
          <section className="rounded-lg border border-border bg-primary-subtle p-(--card-pad)">
            <h2 className="text-h3 font-semibold text-primary">
              {shop?.is_beta_vendor ? "Founding Vendor trial" : "Free trial"}
            </h2>
            <p className="mt-1 text-display font-bold tabular">{daysLeft} days left</p>
            <p className="text-body text-text-secondary">
              {shop?.is_beta_vendor
                ? "Full Premium features, ₱0 subscription, no GMV cap."
                : "Full Premium features, ₱0 subscription. Growth surcharge waived."}
            </p>

            {shop?.is_beta_vendor ? (
              <p className="mt-4 rounded-md bg-bg px-3 py-2 text-body text-text-secondary">
                As a Founding Vendor, your trial has no sales cap — sell as much as you want
                {shop?.trial_ends_at &&
                  ` through ${new Date(shop.trial_ends_at).toLocaleDateString("en-PH", { month: "long", day: "numeric" })}`}
                .
              </p>
            ) : (
              <div className="mt-4">
                <div className="flex items-center justify-between text-caption text-text-secondary">
                  <span>Trial GMV</span>
                  <span className="tabular">
                    {php(currentGmv)} of {php(cap)}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-bg">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-(--duration-slow)"
                    style={{ width: `${capPct}%` }}
                  />
                </div>
                <p className="mt-1 text-caption text-text-secondary">
                  The trial ends at 60 days or {php(cap)} GMV, whichever comes first.
                </p>
              </div>
            )}

            <p className="mt-4 rounded-md bg-bg px-3 py-2 text-body">
              Projected first bill{" "}
              <span className="font-bold tabular">{php(projectedFee)}</span>
              <span className="text-text-secondary"> based on current sales</span>
            </p>
          </section>
        ) : (
          <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
            <h2 className="text-h3 font-semibold">Current tier</h2>
            <p className="mt-1 text-display font-bold tabular">{php(projectedFee)}</p>
            <p className="text-body text-text-secondary">
              {currentTier
                ? `${php(Number(currentTier.min_gmv))} – ${currentTier.max_gmv == null ? "above" : php(Number(currentTier.max_gmv))} GMV`
                : "no tier resolved"}
            </p>
            <dl className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              <Row label="GMV this month" value={php(currentGmv)} />
              <Row label="Billing status" value={shop?.billing_status ?? "—"} />
            </dl>
          </section>
        )}

        {/* Payouts */}
        <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
          <h2 className="text-h3 font-semibold">Payouts</h2>
          {(payouts ?? []).length === 0 ? (
            <p className="mt-2 text-body text-text-secondary">
              No payouts yet. Once orders complete, your earnings appear here.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {payouts!.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0">
                  <span className="text-body">{p.method ?? "—"}</span>
                  <span className="text-body font-bold tabular">{php(Number(p.amount))}</span>
                  <StatusPill tone={p.status === "completed" ? "success" : "attention"}>
                    {p.status}
                  </StatusPill>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-caption text-text-secondary">
            Payout account management arrives with the disbursement integration.
          </p>
        </section>
      </div>

      {/* Tier ladder */}
      <section className="mt-6 rounded-lg border border-border bg-bg p-(--card-pad)">
        <h2 className="text-h2 font-semibold">Tier ladder</h2>
        <p className="mt-1 text-body text-text-secondary">
          Your row is highlighted. Growth above 25% month-over-month adds a 2%
          surcharge on the increase only.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-body">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-2 text-caption font-medium text-text-secondary uppercase">Monthly GMV</th>
                <th className="px-3 py-2 text-caption font-medium text-text-secondary uppercase">Base fee</th>
                <th className="px-3 py-2 text-caption font-medium text-text-secondary uppercase">Overage</th>
              </tr>
            </thead>
            <tbody>
              {(tiers ?? []).map((t) => {
                const mine = currentTier?.id === t.id;
                return (
                  <tr
                    key={t.id}
                    className={`h-14 border-b border-border last:border-0 ${mine ? "bg-primary-subtle" : ""}`}
                  >
                    <td className={`px-3 tabular ${mine ? "font-medium text-primary" : ""}`}>
                      {php(Number(t.min_gmv))}
                      {t.max_gmv == null ? " and up" : ` – ${php(Number(t.max_gmv))}`}
                      {mine && <span className="ml-2 text-caption">← you</span>}
                    </td>
                    <td className="px-3 font-bold tabular">{php(Number(t.base_fee))}</td>
                    <td className="px-3 tabular text-text-secondary">
                      {Number(t.overage_rate) > 0 ? `${Number(t.overage_rate) * 100}% above floor` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Invoice history */}
      <section className="mt-6">
        <h2 className="text-h2 font-semibold">Invoice history</h2>
        {(invoices ?? []).length === 0 ? (
          <p className="mt-3 rounded-lg border border-border bg-bg px-6 py-8 text-center text-body text-text-secondary">
            No invoices yet. The first arrives after your trial ends.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {invoices!.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg p-4"
              >
                <div className="min-w-0">
                  <p className="text-body font-medium">
                    {new Date(inv.period_start).toLocaleDateString("en-PH", {
                      year: "numeric", month: "long",
                    })}
                  </p>
                  <p className="text-caption text-text-secondary">
                    GMV <span className="tabular">{php(Number(inv.gmv))}</span>
                    {Number(inv.growth_surcharge) > 0 && (
                      <> · surcharge <span className="tabular">{php(Number(inv.growth_surcharge))}</span></>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-body font-bold tabular">{php(Number(inv.amount_due))}</span>
                  <StatusPill tone={BILLING_TONE[inv.status as keyof typeof BILLING_TONE] ?? "info"}>
                    {inv.status.replace("_", " ")}
                  </StatusPill>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </VendorShell>
  );
}

/**
 * Trial window maths, outside the component: React's purity rule rightly
 * refuses `Date.now()` inside a render body, and both values are relative to
 * "now".
 */
function trialState(status: string | undefined, endsAt: string | null | undefined) {
  const now = Date.now();
  const end = endsAt ? new Date(endsAt).getTime() : 0;
  return {
    inTrial: status === "trial" && end > now,
    daysLeft: end ? Math.max(0, Math.ceil((end - now) / 86_400_000)) : 0,
  };
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-body text-text-secondary">{label}</dt>
      <dd className="text-body capitalize tabular">{value}</dd>
    </div>
  );
}
