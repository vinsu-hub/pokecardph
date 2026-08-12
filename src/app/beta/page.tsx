import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { LandingHeader } from "@/components/shared/LandingHeader";
import { Footer } from "@/components/shared/Footer";
import { Faq } from "@/components/shared/Faq";

/**
 * Beta Vendor Program landing page — a standalone, shareable pitch for a
 * time-boxed launch-window cohort ("Founding Vendors"), separate from the
 * "Sell" nav link's standard 60-day-trial onboarding. Public by design (not
 * in middleware's PROTECTED array) so a cold link from social/Discord works
 * for a signed-out visitor. Follows the same "no AppShell, LandingHeader
 * instead" shell as the marketing root page (src/app/page.tsx).
 */
export const dynamic = "force-dynamic";

const STEPS = [
  { n: 1, title: "Sign in with Google", body: "Or email — same account either way." },
  { n: 2, title: "Set up your shop", body: "Just a name and location. Two minutes, tops." },
  { n: 3, title: "Start selling free", body: "Full feature access, 3 months, no GMV cap." },
];

const VALUE_PROPS = [
  { title: "3 months free", body: "No subscription fees during your trial — no GMV cap either." },
  { title: "Founding Vendor badge", body: "A permanent mark of being here from day one." },
  { title: "Direct input", body: "Your feedback shapes what we build next." },
  { title: "Full feature access", body: "Scan & grade, auctions, trades, events — nothing gated." },
];

const FAQ_ITEMS = [
  { q: "Do I need to pay anything?", a: "No. Founding Vendors get 3 months completely free, with no GMV cap and no growth surcharge — not even the standard trial's usual sales ceiling." },
  { q: "What happens after 3 months?", a: "Your shop moves onto the standard tiered billing plan, the same as any other vendor — based on what you actually sold, not a flat fee." },
  { q: "Can I still use the app if I miss the beta window?", a: "Yes — standard vendor signup gives every new shop a 60-day free trial. You just won't carry the permanent Founding Vendor badge." },
  { q: "Is there a limit on how many cards I can sell?", a: "No. Founding Vendors are explicitly exempt from the GMV cap that applies to the standard trial." },
];

export default async function BetaLandingPage() {
  const user = await getSessionUser();
  if (user?.isBetaVendor) redirect("/vendor/dashboard");

  const supabase = await createClient();
  const { data: config } = await supabase
    .from("beta_program_config")
    .select("*")
    .eq("id", true)
    .maybeSingle();

  const now = new Date();
  const isOpen = !!config && now >= new Date(config.window_start) && now < new Date(config.window_end);
  const closesOn = config
    ? new Date(config.window_end).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : null;
  const cohortName = config?.cohort_name ?? "Founding Vendors";

  return (
    <div className="flex min-h-svh flex-col">
      <LandingHeader />

      <main className="flex-1">
        {/* ---- Hero ---- */}
        <section className="mx-auto w-full max-w-(--page-max) px-(--gutter) py-16 text-center">
          <h1
            className="mx-auto max-w-[720px] font-bold"
            style={{ fontSize: "clamp(2.25rem, 4vw, 3rem)", lineHeight: 1.1 }}
          >
            Become a <span className="text-primary">Founding Vendor</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[560px] text-body text-text-secondary">
            Join the PokeCard PH beta and sell, trade, and grow your shop free for 3 months.
            No fees. No GMV cap. Just early access.
          </p>

          {isOpen ? (
            <>
              <Link
                href="/beta/signup"
                className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-body font-medium text-white transition-colors duration-(--duration-instant) hover:bg-primary-hover"
              >
                Apply as a Founding Vendor
              </Link>
              {closesOn && (
                <p className="mt-3 text-caption text-text-secondary">
                  {cohortName} registration closes {closesOn}.
                </p>
              )}
            </>
          ) : (
            <div className="mt-8">
              <p className="rounded-md bg-attention-bg px-4 py-2 text-body text-attention">
                Beta registration is currently closed.
              </p>
              <Link
                href="/vendor/onboarding"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-md border border-border px-6 text-body font-medium text-text-primary hover:bg-bg-muted"
              >
                Sign up for standard vendor access
              </Link>
            </div>
          )}
        </section>

        {/* ---- What you get ---- */}
        <section className="mx-auto w-full max-w-(--page-max) px-(--gutter) py-10">
          <h2 className="text-center text-h2 font-semibold">What you get</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VALUE_PROPS.map((v) => (
              <div key={v.title} className="rounded-lg border border-border bg-bg p-(--card-pad)">
                <h3 className="text-h3 font-semibold">{v.title}</h3>
                <p className="mt-1 text-body text-text-secondary">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- How it works ---- */}
        <section className="mx-auto w-full max-w-(--page-max) px-(--gutter) py-10">
          <h2 className="text-center text-h2 font-semibold">How it works</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col items-center text-center">
                <span className="grid size-10 place-items-center rounded-full border-2 border-primary bg-primary text-body font-medium text-white">
                  {s.n}
                </span>
                <h3 className="mt-3 text-h3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-body text-text-secondary">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- FAQ ---- */}
        <section className="mx-auto w-full max-w-[640px] px-(--gutter) py-10">
          <h2 className="text-center text-h2 font-semibold">Frequently asked questions</h2>
          <div className="mt-6">
            <Faq items={FAQ_ITEMS} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
