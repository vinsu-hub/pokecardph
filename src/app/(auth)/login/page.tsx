"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Logo } from "@/components/shared/Logo";
import { GoogleMark } from "@/components/shared/GoogleMark";
import { createClient } from "@/lib/supabase/client";

/**
 * Combined login / sign-up. One page, not two — Supabase handles new vs.
 * returning transparently, so the split is meaningless.
 *
 * Reference: REFERENCE IMAGES/SIGN UP PAGE.png — its split-panel layout and
 * copy, reusing the same hero photo as the landing page. Its email+password
 * form is NOT what got built: this stays the existing magic-link flow,
 * unchanged, per AUTH_GOOGLE_SIGNIN.md §5.1 ("email is a magic link, not a
 * password") — a deliberate decision, already working end-to-end in
 * production, that a visual restyle doesn't get to quietly override.
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
  const next = params.get("next") ?? "/browse";

  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [googlePending, setGooglePending] = useState(false);

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

  async function signInWithGoogle() {
    setGooglePending(true);
    const supabase = createClient();
    const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${site}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    // On success the browser is redirected to Google — this only returns on failure.
    if (error) {
      setGooglePending(false);
      setState("error");
      setMessage(error.message);
    }
  }

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      {/* ---- Left: identity + form ---- */}
      <div className="flex flex-col justify-center px-4 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-[400px]">
          <Logo />

          <h1 className="mt-6 text-display font-bold">Welcome to PokeCard PH</h1>
          <p className="mt-1 text-body text-text-secondary">
            Your collection. Your marketplace. Your community.
          </p>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={googlePending}
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-bg text-body font-medium transition-all duration-(--duration-instant) hover:bg-bg-subtle active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleMark />
            {googlePending ? "Signing in…" : "Continue with Google"}
          </button>

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
                {state === "sending" ? "Sending…" : "Send me a sign-in link"}
              </button>
              {state === "error" && (
                <p className="text-caption text-danger">{message}</p>
              )}
            </form>
          )}

          <p className="mt-5 flex items-center justify-center gap-1.5 text-caption text-text-muted">
            <ShieldIcon />
            Secure sign-in · Your information is protected
          </p>
          <p className="mt-3 text-center text-caption text-text-muted">
            By continuing, you agree to our{" "}
            <span title="Coming soon">Terms of Service</span> and{" "}
            <span title="Coming soon">Privacy Policy</span>.
          </p>
        </div>
      </div>

      {/* ---- Right: hero photo, same asset as the landing page ---- */}
      <div className="relative hidden min-h-[420px] lg:block">
        <Image
          src="/brand/landing-hero.webp"
          alt=""
          fill
          priority
          unoptimized
          className="object-cover"
        />
        {/* Same seam treatment as the landing page (src/app/page.tsx) — a
            white gradient bleeds from the left panel into the photo, for
            visual consistency across every sign-up/sign-in surface rather
            than a hard-edged two-column split. */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-1/3"
          style={{
            background: "linear-gradient(to right, var(--color-bg) 0%, color-mix(in srgb, var(--color-bg) 40%, transparent) 60%, transparent 100%)",
          }}
        />
      </div>
    </main>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M10 2l6.5 2.5v4.8c0 4.3-2.7 8-6.5 9.2-3.8-1.2-6.5-4.9-6.5-9.2V4.5L10 2z" strokeLinejoin="round" />
    </svg>
  );
}
