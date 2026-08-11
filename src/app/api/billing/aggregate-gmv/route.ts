import { guard } from "@/lib/billing";
import { runAggregateGmv } from "@/lib/billing-jobs";

/**
 * gmv-aggregator. Logic lives in `lib/billing-jobs.ts` so `/api/cron/daily`
 * can run it without an HTTP round-trip — Vercel's Hobby tier gives us one
 * daily cron slot, not one per job. This route stays for manual runs and for
 * the verification harness.
 */
export async function GET(request: Request) {
  const denied = guard(request);
  if (denied) return denied;
  return Response.json(await runAggregateGmv());
}
