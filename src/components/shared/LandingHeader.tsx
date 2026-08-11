import Link from "next/link";
import { Logo } from "./Logo";

/**
 * Marketing header for the signed-out landing page only.
 *
 * Deliberately not AppShell — that's the buyer/vendor app's tab-bar system
 * (Home/Trade/Events/Orders, mobile bottom bar, cart badge). This is a
 * simpler, always-desktop-style nav for a page whose entire job is getting a
 * visitor to Sign Up or Log In, not navigating a marketplace.
 */
// "How It Works" and "Help" have no page behind them yet — no spec, no
// content. Rendered inert with a reason, same rule Footer.tsx applies to
// every not-yet-built link, rather than pointing them at /browse as a fake
// stand-in.
const LINKS: [string, string | null][] = [
  ["How It Works", null],
  ["Explore", "/browse"],
  ["Become a Seller", "/vendor/onboarding"],
  ["Help", null],
];

export function LandingHeader() {
  return (
    <header className="border-b border-border bg-bg">
      <div className="mx-auto flex h-16 max-w-(--page-max) items-center justify-between px-(--gutter)">
        <Logo />
        <nav aria-label="Marketing" className="hidden items-center gap-8 md:flex">
          {LINKS.map(([label, href]) =>
            href ? (
              <Link
                key={label}
                href={href}
                className="text-body text-text-secondary transition-colors duration-(--duration-instant) hover:text-text-primary"
              >
                {label}
              </Link>
            ) : (
              <span key={label} title="Coming soon" className="text-body text-text-muted">
                {label}
              </span>
            ),
          )}
        </nav>
      </div>
    </header>
  );
}
