"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Search,
  ArrowLeftRight,
  Package,
  MessageSquare,
  ShoppingCart,
  Menu,
  X,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The buyer-facing app shell.
 *
 *   >= 1024px : top nav — logo, search, links, cart, avatar
 *   <  1024px : compact top bar (hamburger / logo / cart / avatar), search on
 *               its own full-width row, and a bottom tab bar
 *
 * Bottom tab bar is capped at 5 items; anything beyond lives in the hamburger.
 * That cap is a hard UX rule, not a layout preference.
 */

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Phase-gated items render disabled with a tooltip rather than 404ing. */
  disabled?: boolean;
  phase?: string;
};

const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  {
    href: "/trade",
    label: "Trade",
    icon: ArrowLeftRight,
    disabled: true,
    phase: "Trading arrives in a later release",
  },
  { href: "/orders", label: "Orders", icon: Package },
  {
    href: "/messages",
    label: "Messages",
    icon: MessageSquare,
    disabled: true,
    phase: "Messaging arrives in a later release",
  },
];

export function AppShell({
  children,
  cartCount = 0,
}: {
  children: React.ReactNode;
  cartCount?: number;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="flex min-h-svh flex-col">
      {/* ---------------- Top bar ---------------- */}
      <header className="sticky top-0 z-40 border-b border-border bg-bg">
        <div className="mx-auto flex h-16 max-w-(--page-max) items-center gap-4 px-(--gutter)">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="grid size-11 shrink-0 place-items-center rounded-md text-text-secondary transition-colors duration-(--duration-instant) hover:bg-bg-muted lg:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <Link href="/" className="flex h-11 shrink-0 items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-primary text-caption font-bold text-white">
              PC
            </span>
            <span className="text-h3 font-bold tracking-tight">
              PokeCard <span className="text-primary">PH</span>
            </span>
          </Link>

          {/* Desktop search */}
          <form action="/search" className="hidden flex-1 lg:block">
            <div className="relative mx-auto max-w-[520px]">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" />
              <input
                name="q"
                placeholder="Search cards, sets, or shops..."
                className="h-11 w-full rounded-md border border-border bg-bg pr-4 pl-10 text-body outline-none transition-colors duration-(--duration-instant) focus:border-primary"
              />
            </div>
          </form>

          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV.filter((n) => n.href !== "/search").map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
            <Link
              href="/vendor/dashboard"
              className="flex h-11 items-center gap-1.5 rounded-md px-3 text-body font-medium text-text-secondary transition-colors duration-(--duration-instant) hover:bg-bg-muted hover:text-text-primary"
            >
              <Store className="size-4" />
              Sell
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <CartButton count={cartCount} />
            <div className="grid size-9 place-items-center rounded-full bg-bg-muted text-caption font-medium text-text-secondary">
              ?
            </div>
          </div>
        </div>

        {/* Mobile search row */}
        <form action="/search" className="px-(--gutter) pb-3 lg:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" />
            <input
              name="q"
              placeholder="Search cards, sets, or shops..."
              className="h-11 w-full rounded-md border border-border bg-bg pr-4 pl-10 text-body outline-none focus:border-primary"
            />
          </div>
        </form>

        {/* Mobile overflow menu */}
        {menuOpen && (
          <div className="border-t border-border px-(--gutter) py-2 lg:hidden">
            <Link
              href="/vendor/dashboard"
              onClick={() => setMenuOpen(false)}
              className="flex h-12 items-center gap-2 text-body font-medium"
            >
              <Store className="size-4" /> Sell on PokeCard PH
            </Link>
          </div>
        )}
      </header>

      {/* ---------------- Content ---------------- */}
      <main className="mx-auto w-full max-w-(--page-max) flex-1 px-(--gutter) py-6">
        {children}
      </main>

      {/* ---------------- Bottom tab bar ---------------- */}
      <nav
        aria-label="Primary"
        className="sticky bottom-0 z-40 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="flex h-(--tabbar-h) items-stretch">
          {NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            const content = (
              <span className="flex h-full min-w-11 flex-col items-center justify-center gap-0.5">
                <Icon
                  className={cn(
                    "size-5",
                    active ? "text-primary" : "text-text-muted",
                  )}
                />
                <span
                  className={cn(
                    "text-[11px]",
                    active
                      ? "font-medium text-primary"
                      : "text-text-secondary",
                  )}
                >
                  {item.label}
                </span>
              </span>
            );
            return (
              <li key={item.href} className="flex-1">
                {item.disabled ? (
                  <span
                    title={item.phase}
                    aria-disabled
                    className="flex h-full items-center justify-center opacity-40"
                  >
                    {content}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="flex h-full items-center justify-center"
                  >
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const base =
    "flex h-11 items-center rounded-md px-3 text-body font-medium transition-colors duration-(--duration-instant)";

  if (item.disabled) {
    return (
      <span
        title={item.phase}
        aria-disabled
        className={cn(base, "cursor-not-allowed text-text-muted opacity-50")}
      >
        {item.label}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        base,
        active
          ? "text-primary"
          : "text-text-secondary hover:bg-bg-muted hover:text-text-primary",
      )}
    >
      {item.label}
    </Link>
  );
}

function CartButton({ count }: { count: number }) {
  return (
    <Link
      href="/cart"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
      className="relative grid size-11 place-items-center rounded-md text-text-secondary transition-colors duration-(--duration-instant) hover:bg-bg-muted"
    >
      <ShoppingCart className="size-5" />
      {count > 0 && (
        <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-medium text-white tabular">
          {count}
        </span>
      )}
    </Link>
  );
}
