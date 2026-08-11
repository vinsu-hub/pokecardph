"use client";

import Link from "next/link";
import { php } from "@/lib/utils";
import { conditionLabel, type ListingCard } from "@/lib/supabase/types";
import { play } from "@/lib/audio";
import { CardArt } from "./CardArt";

/**
 * The card tile used by Home/Browse, Search, and the storefront shelves.
 *
 * Matches SHOP PAGE.png and SEARTCH RESULTS VIEW.png: condition badge top-left
 * of the image, name, set, price, seller with verified check.
 *
 * Hover is lift + shadow only — the design system's "one motion per event"
 * rule rules out stacking a border change or icon rotation on top.
 */
export function ListingCardTile({ listing }: { listing: ListingCard }) {
  const { cards: card, shops: shop } = listing;

  // card_id became nullable in Phase 4 so sealed product and merch could be
  // auctioned. Those listings have no catalog row, so this component has to
  // tolerate one rather than assume it.
  if (!card) return null;

  return (
    <Link
      href={`/card/${listing.id}`}
      onClick={() => play("select")}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-bg shadow-rest transition-[transform,box-shadow] duration-(--duration-fast) ease-(--ease-out-soft) hover:-translate-y-0.5 hover:shadow-elevated"
    >
      {/* 5:7 is the real card aspect (2.5" x 3.5"), so photographed art fills
          the frame exactly instead of letterboxing inside a 3:4 box. */}
      <div className="relative aspect-[5/7] overflow-hidden bg-bg-muted">
        <span className="absolute top-2 left-2 z-10 rounded-md bg-grade-bg px-2 py-0.5 text-caption font-medium text-grade-text">
          {conditionLabel(listing)}
        </span>
        <CardArt name={card.name} src={card.image_url} />
      </div>

      <div className="flex flex-1 flex-col gap-0.5 p-3">
        <h3 className="truncate text-body font-medium">{card.name}</h3>
        <p className="truncate text-caption text-text-secondary">
          {card.set_name}
          {card.card_number ? ` · ${card.card_number}` : ""}
        </p>
        <p className="mt-1 text-body font-bold tabular">{php(listing.price)}</p>
        <p className="mt-auto flex items-center gap-1 truncate pt-2 text-caption text-text-secondary">
          <span className="truncate">{shop.name}</span>
          <VerifiedMark />
        </p>
      </div>
    </Link>
  );
}

function VerifiedMark() {
  return (
    <svg viewBox="0 0 20 20" className="size-3.5 shrink-0 fill-primary" aria-label="Verified vendor">
      <path d="M10 1.5l2.2 1.6 2.7-.2.9 2.6 2.2 1.6-1 2.6 1 2.6-2.2 1.6-.9 2.6-2.7-.2L10 18.5l-2.2-1.6-2.7.2-.9-2.6L2 12.9l1-2.6-1-2.6 2.2-1.6.9-2.6 2.7.2L10 1.5zm-.8 11.4l4.6-4.6-1.2-1.2-3.4 3.4-1.6-1.6-1.2 1.2 2.8 2.8z" />
    </svg>
  );
}
