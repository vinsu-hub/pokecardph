import { NextResponse, type NextRequest } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

/**
 * Auction closer. Intended to run every minute.
 *
 * Not yet registered as a cron — nothing is deployed. Add to vercel.json when
 * it is:
 *   { "crons": [{ "path": "/api/auctions/close", "schedule": "* * * * *" }] }
 *
 * Guarded by CRON_SECRET so it can't be triggered by anyone who finds the URL:
 * it creates orders and closes auctions, which is not something a stranger
 * should be able to do on demand.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Service role: this runs as no user, and close_due_auctions writes orders
  // on a winner's behalf.
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await admin.rpc("close_due_auctions");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...data });
}
