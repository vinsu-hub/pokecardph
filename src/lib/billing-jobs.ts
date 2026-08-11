import "server-only";
import { admin, periodOf } from "./billing";

/**
 * The three scheduled billing jobs, as callable functions.
 *
 * They were originally written inline in their route handlers. Vercel's Hobby
 * tier allows only daily cron granularity and a small number of jobs, so
 * `/api/cron/daily` runs all three in one invocation — which needs them to be
 * callable without going through HTTP. The individual routes remain as thin
 * wrappers so each job can still be triggered and tested on its own.
 *
 * Every one is idempotent: aggregate upserts, invoice checks for an existing
 * row before writing, reminder only reads.
 */

/**
 * gmv-aggregator — nightly.
 *
 * Sums completed order value plus completed-trade value per shop for the
 * current month and **upserts** it, so the figure is right intra-month rather
 * than only at month end. That matters because the billing page projects a
 * first bill from it — a stale GMV would project the wrong number all month.
 *
 * Also enforces the trial GMV cap: a shop trading past its cap ends its trial
 * early rather than riding a free window at high volume.
 */
export async function runAggregateGmv() {
  const db = admin();
  const period = periodOf(new Date());
  const monthStart = `${period}T00:00:00Z`;

  const { data: shops } = await db
    .from("shops")
    .select("id, trial_gmv_cap, billing_status");

  const results: { shop: string; gmv: number; trialEnded: boolean }[] = [];

  for (const shop of shops ?? []) {
    // Completed orders only — pending and cancelled are not revenue.
    const { data: items } = await db
      .from("order_items")
      .select("price_at_purchase, quantity, orders!inner(status, created_at)")
      .eq("shop_id", shop.id)
      .eq("orders.status", "completed")
      .gte("orders.created_at", monthStart);

    const orderGmv = (items ?? []).reduce(
      (s, r) => s + Number(r.price_at_purchase) * (r.quantity ?? 1),
      0,
    );

    // A completed trade counts at the value of what the shop gave up — the
    // requested side, which is the shop's own listing.
    const { data: tradeItems } = await db
      .from("trade_items")
      .select("estimated_value, trades!inner(shop_id, status, updated_at)")
      .eq("side", "requested")
      .eq("trades.shop_id", shop.id)
      .eq("trades.status", "completed")
      .gte("trades.updated_at", monthStart);

    const tradeGmv = (tradeItems ?? []).reduce(
      (s, r) => s + Number(r.estimated_value ?? 0),
      0,
    );

    const gmv = orderGmv + tradeGmv;

    await db
      .from("vendor_gmv_history")
      .upsert({ shop_id: shop.id, period, gmv }, { onConflict: "shop_id,period" });

    let trialEnded = false;
    if (shop.billing_status === "trial") {
      const cap = Number(shop.trial_gmv_cap ?? 0);
      await db.from("shops").update({ trial_gmv_used: gmv }).eq("id", shop.id);
      if (cap > 0 && gmv > cap) {
        await db
          .from("shops")
          .update({ trial_ends_at: new Date().toISOString(), billing_status: "active" })
          .eq("id", shop.id);
        trialEnded = true;
      }
    }

    results.push({ shop: shop.id, gmv, trialEnded });
  }

  return { ok: true, period, shops: results.length, results };
}

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
export async function runInvoice() {
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

  return {
    ok: true,
    period,
    written: written.length,
    results: written,
    note: "Xendit not provisioned — rows stop at 'pending'; no payable link is generated.",
  };
}

/**
 * trial-reminder — daily.
 *
 * Finds shops exactly 7 or 1 days from trial end and projects their first bill
 * from current-period GMV. The projection is the whole point: a vendor should
 * never be surprised by the first charge.
 *
 * Delivery isn't built — there's no notifications table yet — so this returns
 * the payload it would send rather than pretending to have sent it.
 */
export async function runTrialReminder() {
  const db = admin();
  const now = new Date();
  const period = periodOf(now);

  const { data: shops } = await db
    .from("shops")
    .select("id, name, trial_ends_at")
    .eq("billing_status", "trial")
    .not("trial_ends_at", "is", null);

  const due: {
    shop: string;
    name: string;
    daysLeft: number;
    projected: number;
  }[] = [];

  for (const shop of shops ?? []) {
    const days = Math.round(
      (new Date(shop.trial_ends_at!).getTime() - now.getTime()) / 86_400_000,
    );
    if (days !== 7 && days !== 1) continue;

    const { data: gmvRow } = await db
      .from("vendor_gmv_history")
      .select("gmv")
      .eq("shop_id", shop.id)
      .eq("period", period)
      .maybeSingle();

    const { data: fee } = await db.rpc("resolve_billing", {
      gmv: Number(gmvRow?.gmv ?? 0),
    });

    due.push({
      shop: shop.id,
      name: shop.name,
      daysLeft: days,
      projected: Number(fee ?? 0),
    });
  }

  return {
    ok: true,
    due: due.length,
    results: due,
    note: "Delivery not wired — no notifications table yet. Payload returned, not sent.",
  };
}
