"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Combined login / sign-up. One page, not two — Supabase handles new vs.
 * returning transparently, so the split is meaningless.
 *
 * Layout per AUTH_GOOGLE_SIGNIN.md §5.1. The Google button is rendered
 * DISABLED rather than omitted: Google OAuth is deferred pending the Cloud
 * Console step, and keeping it in place means the layout doesn't shift when
 * it's switched on.
 */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const supabase = createClient();
    const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${site}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else {
      setState("sent");
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-bg-muted px-4 py-10">
      <div className="w-full max-w-[400px]">
        <Link href="/" className="mb-6 flex h-11 items-center justify-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-primary text-caption font-bold text-white">
            PC
          </span>
          <span className="text-h3 font-bold tracking-tight">
            PokeCard <span className="text-primary">PH</span>
          </span>
        </Link>

        <div className="rounded-lg border border-border bg-bg p-(--card-pad) shadow-rest">
          <h1 className="text-h2 font-semibold">Welcome to PokeCard PH</h1>
          <p className="mt-1 text-body text-text-secondary">
            Sign in to buy, sell, and trade Pokémon cards.
          </p>

          {/* Deferred — needs the Google Cloud Console consent screen and
              redirect URIs before it can be enabled. */}
          <button
            type="button"
            disabled
            title="Google Sign-In is coming soon"
            className="mt-5 flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-md border border-border bg-bg text-body font-medium opacity-50"
          >
            <GoogleMark />
            Continue with Google
          </button>
          <p className="mt-1.5 text-center text-caption text-text-muted">
            Google Sign-In is coming soon — use email below.
          </p>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-caption text-text-muted">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {state === "sent" ? (
            <div className="rounded-md bg-success-bg px-4 py-3 text-body text-success">
              Check <span className="font-medium">{email}</span> for your sign-in link.
            </div>
          ) : (
            <form onSubmit={sendLink} className="flex flex-col gap-3">
              <label htmlFor="email" className="text-body font-medium">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 rounded-md border border-border bg-bg px-3 text-body outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={state === "sending"}
                className="h-11 rounded-md bg-primary text-body font-medium text-white transition-all duration-(--duration-instant) hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
              >
                {state === "sending" ? "Sending…" : "Continue with email"}
              </button>
              {state === "error" && (
                <p className="text-caption text-danger">{message}</p>
              )}
            </form>
          )}

          <p className="mt-5 text-center text-caption text-text-muted">
            By continuing, you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.5h4.8a4.1 4.1 0 01-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.6z" />
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 009 18z" />
      <path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 010-3.4V5H.9a9 9 0 000 8l3-2.3z" />
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 00.9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" />
    </svg>
  );
}
