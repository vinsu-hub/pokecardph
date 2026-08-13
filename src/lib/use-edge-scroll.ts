import { useEffect, useRef, useState } from "react";

/**
 * Tracks whether a horizontally-scrolling element is at its start/end, plus
 * a helper to page by ~80% of its own width. Shared by `HorizontalScroller`
 * and the storefront's `ShelfScroller` so the edge-detection logic can't
 * drift between them.
 *
 * `scrollLeft`/`clientWidth`/`scrollWidth` are layout-box values that CSS
 * `transform` (2D or 3D) never affects, so this needs no special handling
 * for a `preserve-3d`-rotated row — the math is identical either way.
 */
export function useEdgeScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
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

  return { ref, atStart, atEnd, scrollByAmount };
}
