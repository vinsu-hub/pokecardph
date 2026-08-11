import { admin, guard, periodOf } from "@/lib/billing";

/**
 * monthly-invoicer — 1st of the month, billing the month just ended.
 *
 * A shop still inside its trial gets a `waived_trial` row at ₱0 rather than
 * being skipped silently — the vendor should be able to see that a cycle ran
 * and cost them nothing.
 *
 * XENDIT IS NOT PROVISIONED. The row, the tier resolution, the growth
 * surcharge and the amount due are all real; the call that would produce a
 * payable link is not made, so rows stop at `pending` instead of advancing to
 * `invoiced`. The billing page says so rather than implying a vendor can pay.
 */
export async function GET(request: Request) {
  const denied = guard(request);
  if (denied) return denied;

  const db = admin();
  const now = new Date();
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const period = periodOf(prev);
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
    .toISOString()
    .slice(0, 10);

  const { data: shops } = await db
    .from("shops")
    .select("id, trial_ends_at, billing_status")
    .neq("billing_status", "restricted");

  const written: { shop: string; status: string; amount: number }[] = [];

  for (const shop of shops ?? []) {
    // Idempotent — the job can be re-run without double-billing.
    const { data: existing } = await db
      .from("vendor_monthly_billing")
      .select("id")
      .eq("shop_id", shop.id)
      .eq("period_start", period)
      .maybeSingle();
    if (existing) continue;

    const inTrial =
      shop.trial_ends_at != null && new Date(shop.trial_ends_at) > now;

    if (inTrial) {
      await db.from("vendor_monthly_billing").insert({
        shop_id: shop.id,
        period_start: period,
        period_end: periodEnd,
        gmv: 0,
        tier_fee: 0,
        growth_surcharge: 0,
        amount_due: 0,
        status: "waived_trial",
      });
      written.push({ shop: shop.id, status: "waived_trial", amount: 0 });
      continue;
    }

    const { data: gmvRow } = await db
      .from("vendor_gmv_history")
      .select("gmv")
      .eq("shop_id", shop.id)
      .eq("period", period)
      .maybeSingle();

    const { data: bill } = await db.rpc("resolve_monthly_bill", {
      p_shop_id: shop.id,
      p_period: period,
    });
    const row = Array.isArray(bill) ? bill[0] : bill;

    await db.from("vendor_monthly_billing").insert({
      shop_id: shop.id,
      period_start: period,
      period_end: periodEnd,
      gmv: Number(gmvRow?.gmv ?? 0),
      tier_fee: Number(row?.tier_fee ?? 0),
      growth_surcharge: Number(row?.growth_surcharge ?? 0),
      amount_due: Number(row?.total ?? 0),
      status: "pending",
    });
    written.push({
      shop: shop.id,
      status: "pending",
      amount: Number(row?.total ?? 0),
    });
  }

  return Response.json({
    ok: true,
    period,
    written: written.length,
    results: written,
    note: "Xendit not provisioned — rows stop at 'pending'; no payable link is generated.",
  });
}
