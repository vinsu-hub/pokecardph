"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Generic chevron-paging wrapper around a horizontally-scrolling row —
 * content-agnostic, no card/shelf knowledge. Deliberately not built on the
 * storefront's `Shelf` (`src/app/shops/[shopId]/page.tsx`): that component
 * is private, storefront-prop-specific, and carries decorative 3D-ledge CSS
 * this page doesn't want. Arrows hide at each scroll extreme rather than
 * disable, so there's no dead-looking control sitting in the row.
 */
export function HorizontalScroller({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setAtStart(el.scrollLeft <= 0);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  function scrollByAmount(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }

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
