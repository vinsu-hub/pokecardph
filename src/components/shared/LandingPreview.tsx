"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { php, cn } from "@/lib/utils";

export type PreviewCard = {
  id: string;
  href: string;
  name: string;
  subtitle: string;
  price: number;
  sellerName: string;
  sellerRating: number;
  imageUrl: string | null;
};

/**
 * The landing page's "For Sale / Auctions / For Trade" preview strip.
 *
 * A different card shape from ListingCardTile on purpose — this is a teaser
 * (rarity + seller rating, no condition badge, no cart affordance), not the
 * real browsing surface. Matches MAIN LANDING PAGE.png rather than reusing
 * the grid tile that page isn't showing.
 *
 * "For Trade" reuses the same active-listings data as "For Sale" — there is
 * no separate for-trade inventory to query, since every listing already
 * supports "Trade for This Card" on Card Detail. This isn't a stand-in for a
 * missing feature, it's an accurate label for what's already true.
 */
export function LandingPreview({
  forSale,
  auctions,
  forTrade,
}: {
  forSale: PreviewCard[];
  auctions: PreviewCard[];
  forTrade: PreviewCard[];
}) {
  const TABS = [
    ["For Sale", forSale, "/browse"],
    ["Auctions", auctions, "/auctions"],
    ["For Trade", forTrade, "/browse"],
  ] as const;

  const [active, setActive] = useState<(typeof TABS)[number][0]>("For Sale");
  const scroller = useRef<HTMLUListElement>(null);
  const current = TABS.find((t) => t[0] === active)!;

  function scroll(dir: 1 | -1) {
    scroller.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  }

  return (
    <div className="min-w-0 rounded-lg border border-border bg-bg p-4">
      <div className="flex items-center justify-between gap-2">
        <div role="tablist" aria-label="Preview" className="flex gap-1">
          {TABS.map(([label]) => (
            <button
              key={label}
              role="tab"
              aria-selected={active === label}
              onClick={() => setActive(label)}
              className={cn(
                "flex h-11 items-center rounded-md px-3 text-body font-medium transition-colors duration-(--duration-instant)",
                active === label
                  ? "text-primary underline decoration-2 underline-offset-4"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Link href={current[2]} className="flex h-11 items-center gap-1 text-caption font-medium text-text-secondary hover:text-text-primary">
          View All ›
        </Link>
      </div>

      <div className="relative mt-3 min-w-0">
        {current[1].length === 0 ? (
          <p className="py-8 text-center text-body text-text-secondary">
            Nothing here yet — check back soon.
          </p>
        ) : (
          <>
            <ul ref={scroller} className="flex gap-3 overflow-x-auto scroll-smooth pb-1">
              {current[1].map((c) => (
                <li key={c.id} className="w-[160px] shrink-0">
                  <Link href={c.href} className="group flex flex-col">
                    <div className="relative aspect-[5/7] overflow-hidden rounded-md bg-bg-muted">
                      {c.imageUrl ? (
                        <Image src={c.imageUrl} alt={c.name} fill sizes="160px" className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center p-2 text-center">
                          <span className="text-caption text-text-primary/50">{c.name}</span>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 truncate text-body font-medium">{c.name}</p>
                    <p className="truncate text-caption text-text-secondary">{c.subtitle}</p>
                    <p className="mt-0.5 text-body font-bold tabular">{php(c.price)}</p>
                    <p className="truncate text-caption text-text-secondary">
                      {c.sellerName} <span className="text-attention">★</span> {c.sellerRating.toFixed(1)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

            {current[1].length > 4 && (
              <>
                <button
                  aria-label="Scroll left"
                  onClick={() => scroll(-1)}
                  className="absolute top-1/3 -left-3 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-bg shadow-rest sm:grid"
                >
                  ‹
                </button>
                <button
                  aria-label="Scroll right"
                  onClick={() => scroll(1)}
                  className="absolute top-1/3 -right-3 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-bg shadow-rest sm:grid"
                >
                  ›
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
