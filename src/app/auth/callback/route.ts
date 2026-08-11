import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link / OAuth callback. Exchanges the code for a session, then sends
 * the user where they were originally headed rather than to a generic home.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/browse";

  // Magic links arrive as token_hash, OAuth as code. Both land here; both
  // write the session through the SSR client so cookies are chunked correctly.
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink" | "email" | "recovery" | "invite",
    });
    if (!error) {
      const dest = next.startsWith("/") ? next : "/browse";
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // `next` is internal-only — reject absolute URLs so this can't be used
      // as an open redirect.
      const dest = next.startsWith("/") ? next : "/browse";
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
