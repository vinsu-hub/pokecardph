import { admin, guard } from "@/lib/billing";

/**
 * Event resolver — every 5 minutes.
 *
 * Go-live, close, and pick a winner. The subtle part lives in the SQL
 * (0009_events.sql): the random point inside the go-live window is resolved
 * ONCE and stored as actual_start_time. Re-rolling it on each tick would push
 * the start further away every pass and the event would never begin.
 */
export async function GET(request: Request) {
  const denied = guard(request);
  if (denied) return denied;

  const { data, error } = await admin().rpc("resolve_events");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, ...data });
}
