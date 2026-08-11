import { guard } from "@/lib/billing";
import { runInvoice } from "@/lib/billing-jobs";

/**
 * monthly-invoicer. Logic lives in `lib/billing-jobs.ts` — see the note in
 * aggregate-gmv's route. Calling this directly runs it regardless of the day
 * of month; the daily orchestrator gates it to the 1st.
 */
export async function GET(request: Request) {
  const denied = guard(request);
  if (denied) return denied;
  return Response.json(await runInvoice());
}
