"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEdgeScroll } from "@/lib/use-edge-scroll";

/**
 * Generic chevron-paging wrapper around a horizontally-scrolling row —
 * content-agnostic, no card/shelf knowledge. Deliberately not built on the
 * storefront's `Shelf` (`src/app/shops/[shopId]/page.tsx`): that component
 * is private, storefront-prop-specific, and carries decorative 3D-ledge CSS
 * this page doesn't want — though its edge-scroll math is shared via
 * `useEdgeScroll` so the two can't drift. Arrows hide at each scroll extreme
 * rather than disable, so there's no dead-looking control sitting in the row.
 */
export function HorizontalScroller({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { ref, atStart, atEnd, scrollByAmount } = useEdgeScroll<HTMLDivElement>();

  return (
    <div className="relative">
      <div ref={ref} className={cn("flex gap-4 overflow-x-auto", className)}>
        {children}
      </div>
      {!atStart && (
        <button
          onClick={() => scrollByAmount(-1)}
          aria-label="Scroll left"
          className="absolute top-1/2 left-0 z-10 hidden size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border bg-bg shadow-elevated sm:grid"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      {!atEnd && (
        <button
          onClick={() => scrollByAmount(1)}
          aria-label="Scroll right"
          className="absolute top-1/2 right-0 z-10 hidden size-11 translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border bg-bg shadow-elevated sm:grid"
        >
          <ChevronRight className="size-5" />
        </button>
      )}
    </div>
  );
}
