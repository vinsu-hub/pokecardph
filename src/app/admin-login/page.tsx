"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Real password sign-in, deliberately not linked from anywhere — not the
 * public login page, not the landing page, not any nav. A real Supabase
 * password account is safe on its own; a guessable "admin" account sitting
 * on the main sign-in page of a live marketplace is a real exposure
 * independent of how well the auth itself is built. This page existing at
 * all is not a secret — its URL just isn't published anywhere a crawler or
 * a curious visitor would find it by browsing the site.
 *
 * Supabase Auth is email-based; there's no username field. Rather than
 * create a second profile + shop for a literal "admin@..." account (which
 * would need its own shop, and so wouldn't show the same populated vendor
 * dashboard the real Foil & Flame Cards test account already has), this
 * maps the typed username onto that account's real email and signs in
 * against it directly. Nothing here is a special code path — it's the same
 * signInWithPassword the seeded test accounts already support, since
 * magic-link and password auth aren't mutually exclusive per user in
 * Supabase.
 */
const ACCOUNTS: Record<string, string> = {
  admin: "foilandflame@pokecard.test",
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = useState("");

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    const email = ACCOUNTS[username.trim().toLowerCase()];
    if (!email) {
      setState("error");
      setMessage("Invalid credentials");
      return;
    }

    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setState("error");
      setMessage("Invalid credentials");
      return;
    }
    router.push("/vendor/dashboard");
    router.refresh();
  }

  return (
    <main className="grid min-h-svh place-items-center bg-bg-muted px-4 py-10">
      <div className="w-full max-w-[360px]">
        <div className="rounded-lg border border-border bg-bg p-(--card-pad) shadow-rest">
          <h1 className="text-h2 font-semibold">Admin access</h1>
          <p className="mt-1 text-body text-text-secondary">
            Internal sign-in for reviewing the vendor side.
          </p>

          <form onSubmit={signIn} className="mt-5 flex flex-col gap-3">
            <label htmlFor="username" className="text-body font-medium">Username</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-11 rounded-md border border-border bg-bg px-3 text-body outline-none focus:border-primary"
            />

            <label htmlFor="password" className="text-body font-medium">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-md border border-border bg-bg px-3 text-body outline-none focus:border-primary"
            />

            <button
              type="submit"
              disabled={state === "sending"}
              className="mt-2 h-11 rounded-md bg-primary text-body font-medium text-white transition-all duration-(--duration-instant) hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
            >
              {state === "sending" ? "Signing in…" : "Sign in"}
            </button>
            {state === "error" && (
              <p role="alert" className="text-caption text-danger">{message}</p>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
