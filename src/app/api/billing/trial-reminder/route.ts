import { admin, guard, periodOf } from "@/lib/billing";

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
export async function GET(request: Request) {
  const denied = guard(request);
  if (denied) return denied;

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

  return Response.json({
    ok: true,
    due: due.length,
    results: due,
    note: "Delivery not wired — no notifications table yet. Payload returned, not sent.",
  });
}
