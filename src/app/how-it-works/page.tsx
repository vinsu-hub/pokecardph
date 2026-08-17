import Link from "next/link";
import { ScanLine, Sparkles } from "lucide-react";
import { LandingHeader } from "@/components/shared/LandingHeader";
import { Footer } from "@/components/shared/Footer";
import { Faq } from "@/components/shared/Faq";

/**
 * How It Works — the general marketplace explainer for both buyers and
 * sellers, linked from the marketing header and global footer. Public by
 * design (not in middleware's PROTECTED array) and rendered identically
 * signed-in or signed-out, same shell as the beta vendor pitch
 * (src/app/beta/page.tsx) — no AppShell, no sign-out redirect gate.
 *
 * No reference image exists for this screen — built to the same
 * LandingHeader/Footer marketing-page shell and section patterns /beta
 * already established, not a new pattern.
 */

const BUYER_STEPS = [
  { n: 1, title: "Browse freely", body: "Search cards, shops, and live auctions — no sign-in required to look around." },
  { n: 2, title: "Buy, bid, or trade", body: "Buy Now a fixed-price listing, place a bid on an auction, or propose a card-for-card trade." },
  { n: 3, title: "Track it through", body: "Sign in at the point of action, then follow your order, bid, or trade until it's done." },
];

const SELLER_STEPS = [
  { n: 1, title: "Set up your shop", body: "Sign in and create a shop in minutes — that's what makes you a vendor, no separate account type." },
  { n: 2, title: "List your cards", body: "Add a listing as a fixed-price sale, a trade offer, or an auction — every listing includes a condition scan." },
  { n: 3, title: "Sell and fulfill", body: "Get notified on orders, bids, and trade offers, then ship or arrange an in-app meetup." },
];

const CONDITION_TIERS = [
  {
    icon: ScanLine,
    title: "Flat Scan (required)",
    body: "Every listing includes a single photo scan wrapped onto a 3D card mesh, so you can inspect the actual card, not just a stock photo.",
  },
  {
    icon: Sparkles,
    title: "Full Condition Scan (optional)",
    body: "Vendors can add a guided multi-angle scan for a Verified Condition badge — extra confidence in the card's declared condition.",
  },
];

const TRANSACTION_MODES = [
  { title: "Buy Now", body: "Fixed-price listings for graded and non-graded cards — straightforward, no bidding." },
  { title: "Trade", body: "Propose a card-for-card exchange with another collector, then coordinate an in-app meetup." },
  { title: "Auction", body: "Bid on rare cards, sealed product, and signed items — including the weekly \"Who's That Pokémon?\" giveaway events." },
];

const FAQ_ITEMS = [
  { q: "Do I need an account to browse?", a: "No. Home, Browse, card details, shop pages, and auction listings are all open to everyone. You'll only be asked to sign in when you take an action — buying, bidding, trading, or messaging a vendor." },
  { q: "What's the difference between buyers and vendors?", a: "Everyone who signs in starts as a buyer. You become a seller the moment you set up a shop — there's no separate account type, and it's free to start." },
  { q: "How is a card's condition verified?", a: "Every listing includes a required Flat Scan — a photo scan on a 3D card mesh. Vendors can optionally add a more detailed Full Condition Scan for a Verified Condition badge." },
  { q: "What happens after I place an order or win an auction?", a: "You can track its status from your account until the vendor ships it or you arrange an in-app meetup for a trade or local pickup." },
  { q: "Is there a cost to start selling?", a: "New shops get a 60-day free trial with no upfront cost. After that, standard vendor billing applies based on what you actually sell." },
];

export default function HowItWorksPage() {
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
            How <span className="text-primary">PokeCard PH</span> works
          </h1>
          <p className="mx-auto mt-4 max-w-[560px] text-body text-text-secondary">
            Buy, trade, and sell Pokémon cards with verified Filipino vendors — no account needed
            to start browsing.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/browse"
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-body font-medium text-white transition-colors duration-(--duration-instant) hover:bg-primary-hover"
            >
              Start Browsing
            </Link>
            <Link
              href="/vendor/onboarding"
              className="inline-flex h-11 items-center justify-center rounded-md border border-border px-6 text-body font-medium text-text-primary transition-colors duration-(--duration-instant) hover:bg-bg-muted"
            >
              Become a Seller
            </Link>
          </div>
        </section>

        {/* ---- For Buyers ---- */}
        <section className="mx-auto w-full max-w-(--page-max) px-(--gutter) py-10">
          <h2 className="text-center text-h2 font-semibold">For Buyers</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {BUYER_STEPS.map((s) => (
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

        {/* ---- For Sellers ---- */}
        <section className="mx-auto w-full max-w-(--page-max) px-(--gutter) py-10">
          <h2 className="text-center text-h2 font-semibold">For Sellers</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {SELLER_STEPS.map((s) => (
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

        {/* ---- Trust & Condition ---- */}
        <section className="mx-auto w-full max-w-(--page-max) px-(--gutter) py-10">
          <h2 className="text-center text-h2 font-semibold">Condition you can actually see</h2>
          <p className="mx-auto mt-2 max-w-[560px] text-center text-body text-text-secondary">
            Every card&apos;s condition is vendor-declared and backed by a scan — not just a grade
            written in the description.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {CONDITION_TIERS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-lg border border-border bg-bg p-(--card-pad)">
                <span className="grid size-9 place-items-center rounded-full bg-primary-subtle text-primary">
                  <Icon className="size-4.5" />
                </span>
                <p className="mt-3 text-body font-medium">{title}</p>
                <p className="mt-1 text-caption text-text-secondary">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Three ways to trade ---- */}
        <section className="mx-auto w-full max-w-(--page-max) px-(--gutter) py-10">
          <h2 className="text-center text-h2 font-semibold">Three ways to trade</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TRANSACTION_MODES.map((m) => (
              <div key={m.title} className="rounded-lg border border-border bg-bg p-(--card-pad)">
                <h3 className="text-h3 font-semibold">{m.title}</h3>
                <p className="mt-1 text-body text-text-secondary">{m.body}</p>
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
