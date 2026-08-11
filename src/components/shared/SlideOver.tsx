"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * The mobile counterpart to every right rail, and the desktop detail panel
 * (vendor order detail, filters). Slides in from the right with a backdrop
 * fade at --duration-base; the close is the reverse at --duration-fast,
 * because exits should feel quicker than entrances.
 *
 * Under 1024px a right rail becomes one of these — never squeezed inline.
 */
export function SlideOver({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  // Portals can't render during SSR — mount first, then portal, so the server
  // and first client render agree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Escape to close, and lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        aria-label="Close panel"
        onClick={onClose}
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
        aria-label={title}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col bg-bg shadow-elevated transition-transform ease-(--ease-out-soft)",
          open
            ? "translate-x-0 duration-(--duration-base)"
            : "translate-x-full duration-(--duration-fast)",
        )}
      >
        {title && (
          <header className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-h3 font-semibold">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid size-11 place-items-center rounded-md text-text-secondary transition-colors duration-(--duration-instant) hover:bg-bg-muted"
            >
              ✕
            </button>
          </header>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && (
          <footer className="border-t border-border px-6 py-4">{footer}</footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
