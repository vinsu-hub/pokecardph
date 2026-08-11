import { guard } from "@/lib/billing";
import { runAggregateGmv, runInvoice, runTrialReminder } from "@/lib/billing-jobs";

/**
 * The one daily cron.
 *
 * Vercel's Hobby tier allows only daily cron granularity, so the three billing
 * jobs run here in sequence rather than as three separate schedules. Order
 * matters: GMV is aggregated first, because both the invoice amount and the
 * trial-reminder projection read the figure it writes. Running them in the
 * other order would bill and project against yesterday's number.
 *
 * The two sub-daily jobs — the auction closer (every minute) and the event
 * resolver (every 5 minutes) — cannot live here. They are scheduled with
 * pg_cron inside Postgres, calling `close_due_auctions()` and
 * `resolve_events()` directly. Both are already SECURITY DEFINER functions, so
 * that path needs no HTTP hop and no plan upgrade. See
 * `supabase/migrations/0011_pg_cron.sql`.
 *
 * Invoicing is gated to the 1st: it bills the month just ended, and running it
 * mid-month would write a period row before that period is over. Every job is
 * individually idempotent, so a retry after a partial failure is safe.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const denied = guard(request);
  if (denied) return denied;

  const startedAt = new Date();
  const isFirstOfMonth = startedAt.getUTCDate() === 1;

  const gmv = await runAggregateGmv();
  const reminder = await runTrialReminder();
  const invoice = isFirstOfMonth
    ? await runInvoice()
    : { skipped: "not the 1st of the month" };

  return Response.json({
    ok: true,
    ranAt: startedAt.toISOString(),
    jobs: { aggregateGmv: gmv, trialReminder: reminder, invoice },
  });
}
