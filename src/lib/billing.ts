import "server-only";
import { createClient as createAdmin } from "@supabase/supabase-js";

/**
 * Shared helpers for the three scheduled billing routes.
 *
 * They run as no user — writing GMV history and invoices on a shop's behalf —
 * so they use the service-role client. The CRON_SECRET guard matches the
 * pattern already set by /api/auctions/close.
 */

export function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/** Returns null when authorised, or a 401 Response when not. */
export function guard(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null; // unset in local dev
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** First day of the month a date falls in — the period key for GMV history. */
export function periodOf(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}
