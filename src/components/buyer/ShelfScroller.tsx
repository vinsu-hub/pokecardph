"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEdgeScroll } from "@/lib/use-edge-scroll";

/**
 * The storefront shelf's scrolling row + chevron paging. A separate client
 * component from `Shelf` (`src/app/shops/[shopId]/page.tsx`, a server
 * component) since chevrons need interactivity. Shares its edge-detection
 * math with `HorizontalScroller` via `useEdgeScroll` rather than
 * reimplementing it.
 *
 * The chevron buttons render as siblings of the scrolling `<ul>` (both
 * direct children of `.shelf`, which is `position: relative`), not as its
 * children — `.shelf-row` carries the isometric `preserve-3d` transform, and
 * the chevrons need to stay flat/unrotated on top of it, not compose into
 * that 3D scene.
 */
export function ShelfScroller({ children }: { children: React.ReactNode }) {
  const { ref, atStart, atEnd, scrollByAmount } = useEdgeScroll<HTMLUListElement>();

  return (
    <>
      <ul ref={ref} className="shelf-row relative z-10 flex gap-4 overflow-x-auto pb-6">
        {children}
      </ul>
      {/* Inset within .shelf's edge rather than straddling it — unlike
          HorizontalScroller's plain row, .shelf clips its own overflow-x to
          contain the isometric row's 3D bleed (see globals.css), so a
          button relying on overflowing that box would be half-unclickable. */}
      {!atStart && (
        <button
          onClick={() => scrollByAmount(-1)}
          aria-label="Scroll left"
          className="absolute top-1/2 left-2 z-20 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-bg shadow-elevated sm:grid"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      {!atEnd && (
        <button
          onClick={() => scrollByAmount(1)}
          aria-label="Scroll right"
          className="absolute top-1/2 right-2 z-20 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-bg shadow-elevated sm:grid"
        >
          <ChevronRight className="size-5" />
        </button>
      )}
    </>
  );
}
