import { cn } from "@/lib/utils";

/**
 * Pins the primary action above the bottom tab bar on mobile, so Buy Now /
 * Proceed to Checkout is never below the fold. Inline on desktop, where the
 * action sits naturally in the layout.
 *
 * Offset by --tabbar-h plus the safe-area inset so it clears both the tab bar
 * and the home indicator on notched devices.
 */
export function StickyActionBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Mobile: fixed above the tab bar.
        "fixed inset-x-0 z-30 border-t border-border bg-bg px-4 py-3 shadow-elevated",
        "bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))]",
        // Desktop: back into flow, no chrome.
        "lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Spacer to reserve the StickyActionBar's height in the document flow on
 * mobile, so the last of the page content isn't hidden behind it.
 * Reserving space rather than letting it overlap — CLS discipline.
 */
export function StickyActionBarSpacer() {
  return <div aria-hidden className="h-20 lg:hidden" />;
}
