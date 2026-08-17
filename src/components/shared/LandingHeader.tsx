"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

/**
 * Marketing header for the signed-out landing page only.
 *
 * Deliberately not AppShell — that's the buyer/vendor app's tab-bar system
 * (Home/Trade/Events/Orders, mobile bottom bar, cart badge). This is a
 * simpler, always-desktop-style nav for a page whose entire job is getting a
 * visitor to Sign Up or Log In, not navigating a marketplace. Still shares
 * AppShell's active-link convention (text-primary + aria-current), since
 * this header now renders across three marketing pages (/, /beta,
 * /how-it-works) and silently identical links regardless of page was a real
 * gap, not a stylistic difference from AppShell worth keeping.
 */
// "Help" has no page behind it yet — no spec, no content. Rendered inert
// with a reason, same rule Footer.tsx applies to every not-yet-built link,
// rather than pointing it at /browse as a fake stand-in.
const LINKS: [string, string | null][] = [
  ["How It Works", "/how-it-works"],
  ["Explore", "/browse"],
  ["Become a Seller", "/vendor/onboarding"],
  ["Help", null],
];

export function LandingHeader() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname.startsWith(href);

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
                aria-current={isActive(href) ? "page" : undefined}
                className={
                  isActive(href)
                    ? "text-body font-medium text-primary"
                    : "text-body text-text-secondary transition-colors duration-(--duration-instant) hover:text-text-primary"
                }
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
