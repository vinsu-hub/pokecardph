"use client";

import Link from "next/link";
import { php } from "@/lib/utils";
import { conditionLabel, type ListingCard } from "@/lib/supabase/types";
import { play } from "@/lib/audio";
import { VerifiedMark } from "@/components/shared/VerifiedMark";
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
          the frame exactly instead of letterboxing inside a 3:4 box.
          `card-art` is inert here — only globals.css's `.shelf-item
          .card-art` rule gives it behavior (a hover light-sweep), so this
          has zero effect outside the shop storefront's shelves. */}
      <div className="relative aspect-[5/7] overflow-hidden bg-bg-muted card-art">
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
