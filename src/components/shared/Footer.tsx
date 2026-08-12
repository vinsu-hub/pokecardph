import Link from "next/link";
import { Logo } from "./Logo";

/**
 * Global footer.
 * Source: POKECARD_PH_BRAND_ALIGNMENT.md §4 — a genuine addition, not a
 * retrofit; no prior phase specced one.
 *
 * Buyer-facing pages only. Vendor dashboard pages stay full-height app shells
 * without a footer, consistent with the sidebar-driven layout already
 * established — a footer under a fixed sidebar reads as a mistake.
 *
 * Terms and Privacy point at the Phase 9 legal routes rather than duplicating
 * them. Those routes don't exist yet, which is why they're marked here.
 */

const COLUMNS: [string, [string, string, boolean?][]][] = [
  ["Shop", [
    ["All Cards", "/browse"],
    ["Graded Cards", "/?type=graded"],
    ["Booster Packs", "/auctions"],
    ["Accessories", "/search?q=accessor", true],
  ]],
  ["Company", [
    ["About Us", "/about", true],
    ["How It Works", "/how-it-works", true],
    ["Terms of Service", "/terms", true],
    ["Privacy Policy", "/privacy", true],
  ]],
  ["Help", [
    ["FAQ", "/faq", true],
    ["Shipping Info", "/shipping", true],
    ["Returns & Refunds", "/returns", true],
    ["Contact Us", "/contact", true],
  ]],
];

const SOCIALS = ["Facebook", "Instagram", "TikTok", "YouTube", "Discord"];

export function Footer() {
  return (
    <footer className="mt-12 bg-ink text-white">
      <div className="mx-auto grid max-w-(--page-max) gap-8 px-(--gutter) py-10 lg:grid-cols-[1.2fr_repeat(3,1fr)_1.4fr]">
        <div>
          <Logo reversed href="/browse" />
          <p className="mt-3 text-caption text-white/60">
            © {new Date().getFullYear()} PokeCard PH. All rights reserved.
          </p>
          <p className="mt-2 text-caption text-white/40">
            Buy, sell and trade Pokémon cards with verified Filipino vendors.
          </p>
        </div>

        {COLUMNS.map(([heading, links]) => (
          <nav key={heading} aria-label={heading}>
            <h2 className="text-body font-semibold">{heading}</h2>
            <ul className="mt-3 flex flex-col">
              {links.map(([label, href, pending]) => (
                <li key={label}>
                  {pending ? (
                    // Not built yet. Rendered inert with a reason rather than
                    // linking to a 404 — the same rule applied everywhere else.
                    <span
                      title="Coming soon"
                      className="flex h-11 items-center text-body text-white/35"
                    >
                      {label}
                    </span>
                  ) : (
                    <Link
                      href={href}
                      className="flex h-11 items-center text-body text-white/70 transition-colors duration-(--duration-instant) hover:text-primary"
                    >
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <h2 className="text-body font-semibold">Stay in the loop</h2>
          <p className="mt-1 text-caption text-white/60">
            New drops, live auctions and event announcements.
          </p>
          {/* Not built yet — no newsletter backend exists. Disabled rather
              than a live form that would just reload the page on submit,
              the same rule the links above and the socials below follow. */}
          <form className="mt-3 flex gap-2">
            <label htmlFor="newsletter" className="sr-only">Email address</label>
            <input
              id="newsletter"
              name="email"
              type="email"
              placeholder="you@example.com"
              disabled
              title="Newsletter delivery isn't wired yet"
              className="h-11 min-w-0 flex-1 rounded-md border border-white/20 bg-white/5 px-3 text-body text-white placeholder:text-white/40 outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="button"
              disabled
              aria-label="Subscribe"
              title="Newsletter delivery isn't wired yet"
              className="grid size-11 shrink-0 place-items-center rounded-md bg-primary text-white transition-colors duration-(--duration-instant) hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary"
            >
              ➤
            </button>
          </form>

          <ul className="mt-4 flex flex-wrap gap-2">
            {SOCIALS.map((s) => (
              <li key={s}>
                <span
                  title="Social links coming soon"
                  className="grid size-11 place-items-center rounded-full bg-white/10 text-caption text-white/60"
                >
                  {s[0]}
                  <span className="sr-only">{s}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
