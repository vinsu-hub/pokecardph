"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Every left filter sidebar in the product renders through this.
 *
 *   >= 1024px : inline sidebar column, always visible
 *   <  1024px : a "Filters" trigger button that opens a bottom sheet
 *
 * Bottom sheet rather than a centered modal, deliberately — it's reachable
 * with a thumb, which a centered dialog is not.
 */
export function FilterSheet({
  children,
  activeCount = 0,
  className,
}: {
  children: React.ReactNode;
  /** Shown on the mobile trigger so active filters aren't invisible when collapsed. */
  activeCount?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* Desktop: inline sidebar */}
      <aside
        className={cn(
          "hidden w-[264px] shrink-0 lg:block",
          className,
        )}
      >
        {children}
      </aside>

      {/* Mobile: trigger */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-bg px-4 text-body font-medium transition-colors duration-(--duration-instant) active:scale-[0.98] lg:hidden"
      >
        Filters
        {activeCount > 0 && (
          <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-caption font-medium text-white">
            {activeCount}
          </span>
        )}
      </button>

      {/* Mobile: bottom sheet */}
      {mounted &&
        createPortal(
          <div
            className={cn(
              "fixed inset-0 z-50 lg:hidden",
              open ? "pointer-events-auto" : "pointer-events-none",
            )}
            aria-hidden={!open}
          >
            <button
              aria-label="Close filters"
              onClick={() => setOpen(false)}
              className={cn(
                "absolute inset-0 bg-text-primary/40 transition-opacity",
                open
                  ? "opacity-100 duration-(--duration-base)"
                  : "opacity-0 duration-(--duration-fast)",
              )}
              tabIndex={open ? 0 : -1}
            />
            <div
              role="dialog"
              aria-modal={open}
              aria-label="Filters"
              className={cn(
                "absolute inset-x-0 bottom-0 max-h-[85svh] overflow-y-auto rounded-t-[20px] bg-bg pb-[env(safe-area-inset-bottom)] transition-transform ease-(--ease-out-soft)",
                open
                  ? "translate-y-0 duration-(--duration-base)"
                  : "translate-y-full duration-(--duration-fast)",
              )}
            >
              {/* Grab handle — signals the sheet is dismissible. */}
              <div className="sticky top-0 flex flex-col items-center bg-bg pt-3">
                <span className="h-1 w-9 rounded-full bg-border" />
                <div className="mt-3 flex w-full items-center justify-between border-b border-border px-4 pb-3">
                  <h2 className="text-h3 font-semibold">Filters</h2>
                  <button
                    onClick={() => setOpen(false)}
                    className="h-11 px-2 text-body font-medium text-primary"
                  >
                    Done
                  </button>
                </div>
              </div>
              <div className="px-4 py-4">{children}</div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
