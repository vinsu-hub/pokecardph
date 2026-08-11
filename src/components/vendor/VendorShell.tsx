"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Vendor face shell: fixed left sidebar + main, per VENDOR DASHBOARD VIEW.png.
 *
 * Below 1024px the sidebar collapses to a horizontal scrolling nav strip
 * rather than a hamburger — a vendor moving between Orders and Trade Requests
 * on a phone shouldn't have to open a menu each time.
 *
 * Items belonging to phases that aren't built render disabled with a tooltip,
 * the same treatment AppShell gives Trade and Messages. Never a dead link.
 */

type Item = { href: string; label: string; disabled?: boolean; note?: string };

const NAV: Item[] = [
  { href: "/vendor/dashboard", label: "Dashboard" },
  { href: "/vendor/listings", label: "Listings" },
  { href: "/vendor/orders", label: "Orders" },
  { href: "/vendor/trade-requests", label: "Trade Requests" },
  { href: "/vendor/auctions", label: "Auctions" },
  { href: "/vendor/settings", label: "Shop Settings", disabled: true, note: "Shop settings arrive in a later release" },
];

export function VendorShell({
  children,
  shopName,
  tier,
}: {
  children: React.ReactNode;
  shopName: string;
  tier?: "free" | "premium";
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-svh flex-col bg-bg-muted lg:flex-row">
      {/* ---- Sidebar (desktop) / strip (mobile) ---- */}
      <aside className="shrink-0 border-b border-border bg-bg lg:w-[260px] lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3 px-4 py-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-caption font-bold text-white">
            {shopName.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-body font-semibold">{shopName}</p>
            {tier === "premium" && (
              <span className="mt-0.5 inline-block rounded-full bg-paid-bg px-2 py-0.5 text-caption font-medium text-paid">
                Premium Shop
              </span>
            )}
          </div>
        </div>

        <nav className="px-2 pb-3">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              const base =
                "flex h-11 shrink-0 items-center whitespace-nowrap rounded-md px-3 text-body font-medium transition-colors duration-(--duration-instant)";
              return (
                <li key={item.href}>
                  {item.disabled ? (
                    <span
                      title={item.note}
                      aria-disabled
                      className={cn(base, "cursor-not-allowed text-text-muted opacity-50")}
                    >
                      {item.label}
                    </span>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        base,
                        active
                          ? "bg-primary-subtle text-primary"
                          : "text-text-secondary hover:bg-bg-muted hover:text-text-primary",
                      )}
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hidden px-4 lg:block">
          <Link href="/" className="text-caption text-primary">
            ← Back to buyer view
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-(--gutter) py-6">{children}</main>
    </div>
  );
}
