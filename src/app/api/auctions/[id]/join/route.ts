import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Join an Action Event.
 *
 * Mirrors bid/route.ts's shape: a thin wrapper, all real logic (the
 * participant cap check, the idempotent already-joined case) lives in
 * join_action_event (0014_action_events.sql), because only a locked
 * transaction can make the cap check race-free against two people joining
 * the last slot at once.
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
    return NextResponse.json({ ok: false, error: "Sign in to join" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("join_action_event", { p_auction_id: id });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: data?.ok ? 200 : 400 });
}
