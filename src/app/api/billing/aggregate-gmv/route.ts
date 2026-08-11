import { admin, guard, periodOf } from "@/lib/billing";

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
export async function GET(request: Request) {
  const denied = guard(request);
  if (denied) return denied;

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

  return Response.json({ ok: true, period, shops: results.length, results });
}
