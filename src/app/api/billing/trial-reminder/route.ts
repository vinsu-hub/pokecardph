import { guard } from "@/lib/billing";
import { runTrialReminder } from "@/lib/billing-jobs";

/**
 * trial-reminder. Logic lives in `lib/billing-jobs.ts` — see the note in
 * aggregate-gmv's route.
 */
export async function GET(request: Request) {
  const denied = guard(request);
  if (denied) return denied;
  return Response.json(await runTrialReminder());
}
