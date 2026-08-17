"use client";

import { useState } from "react";

/**
 * Wraps a shelf card with cursor-relative 3D tilt — a client-only concern
 * `ListingCardTile` itself must stay free of, since that component is also
 * reused unmodified by Home/Browse and Search outside the shelf context.
 *
 * Mirrors a reference "Collector's Gallery" build's TiltCard pattern
 * (D:\POKECARD STORE FRONT\pokecard-storefront(3)), but wired all the way
 * through: that reference computes --rx/--ry on mousemove yet its own CSS
 * never reads them, so cards there don't actually follow the cursor despite
 * its own design doc describing that interaction. Here globals.css's
 * `.shelf-item:hover`/`.shelf-shine` rules consume `--tilt-rx`/`--tilt-ry`/
 * `--shine-x`/`--shine-y` directly, so the tilt and the highlight are real.
 */
export function ShelfCardTilt({ children }: { children: React.ReactNode }) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  function onMove(e: React.MouseEvent<HTMLLIElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    // +/-8deg cap — "restrained 3D tilt... capped at 8 degrees" per the
    // reference's own design-intent doc.
    setStyle({
      "--tilt-rx": `${(0.5 - y) * 16}deg`,
      "--tilt-ry": `${(x - 0.5) * 16}deg`,
      "--shine-x": `${x * 100}%`,
      "--shine-y": `${y * 100}%`,
    } as React.CSSProperties);
  }

  return (
    <li
      className="shelf-item relative w-[160px] shrink-0 sm:w-[200px]"
      style={style}
      onMouseMove={onMove}
      onMouseLeave={() => setStyle({})}
    >
      {children}
      <span aria-hidden className="shelf-shine" />
    </li>
  );
}
