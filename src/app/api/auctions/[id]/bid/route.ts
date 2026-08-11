import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Bid placement.
 *
 * The route is a thin wrapper: all validation, the row lock, proxy resolution
 * and the anti-snipe extension live in the `place_bid` Postgres function
 * (0005_place_bid.sql), because only a transaction can make them atomic.
 *
 * Nothing here trusts the client. The amount is re-checked server-side against
 * current_bid + bid_increment, and the caller's identity comes from the
 * session, never the request body.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in to place a bid" }, { status: 401 });
  }

  let body: { amount?: number; maxProxy?: number | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid bid amount" }, { status: 400 });
  }
  const maxProxy =
    body.maxProxy == null || !Number.isFinite(Number(body.maxProxy))
      ? null
      : Number(body.maxProxy);

  if (maxProxy != null && maxProxy < amount) {
    return NextResponse.json(
      { ok: false, error: "Your maximum must be at least your bid" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc("place_bid", {
    p_auction_id: id,
    p_amount: amount,
    p_max_proxy: maxProxy,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: data?.ok ? 200 : 400 });
}
