"use client";

import { useState } from "react";
import { GoogleMark } from "@/components/shared/GoogleMark";
import { createClient } from "@/lib/supabase/client";

/**
 * The landing page's own "Continue with Google" button — a separate control
 * from the one on /login, so it needs its own client-side wiring rather than
 * a `disabled` placeholder. Same signInWithOAuth call as /login's button.
 */
export function LandingGoogleButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${site}/auth/callback?next=/browse` },
    });
    if (authError) {
      setPending(false);
      setError(authError.message);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={pending}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-bg text-body font-medium transition-all duration-(--duration-instant) hover:bg-bg-subtle active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleMark />
        {pending ? "Signing in…" : "Continue with Google"}
      </button>
      {error && <p className="mt-1.5 text-center text-caption text-danger">{error}</p>}
    </>
  );
}
