"use client";

import Link from "next/link";
import { php } from "@/lib/utils";
import { conditionLabel, type ListingCard } from "@/lib/supabase/types";
import { play } from "@/lib/audio";
import { CardArt } from "./CardArt";

/**
 * The Shop Storefront shelf's own card — not ListingCardTile, which stays
 * shared/unmodified by Home/Browse/Search and this page's own flat-list
 * view. Composition ported from the "Collector's Gallery" reference's
 * .product-card/.card-art/.card-label (image on top, a label chip
 * overlapping its bottom edge), on this app's own tokens and real card
 * aspect ratio, not the reference's colors or fixed pixel height.
 *
 * The label overlaps via a negative margin, not true `position:absolute` —
 * `.shelf-item` (the <li> ShelfCardTilt renders) carries a live
 * `preserve-3d` tilt transform, and an absolutely-positioned child inside a
 * 3D-transformed ancestor is a real cross-browser rendering risk. A
 * negative-margin pull reads the same (image, then an overlapping label)
 * while staying a normal flow element that tilts identically to the image.
 *
 * Condition/grade shows once, in the existing top-left badge convention
 * (SHOP PAGE.png / SEARCH RESULTS VIEW.png, same as ListingCardTile) — the
 * reference's own card has no such badge and only shows grade once, inside
 * the label; repeating it in both places here would be a redundancy neither
 * version has. The shop name + verified mark row ListingCardTile shows is
 * dropped too: every card on a shop's own storefront is already that one
 * shop, named in the hero above.
 */
export function ShopShelfCard({ listing }: { listing: ListingCard }) {
  const { cards: card } = listing;
  if (!card) return null;

  return (
    <Link
      href={`/card/${listing.id}`}
      onClick={() => play("select")}
      className="group relative flex flex-col"
    >
      <div className="card-art relative aspect-[5/7] overflow-hidden rounded-t-lg bg-bg-muted shadow-rest">
        <span className="absolute top-2 left-2 z-10 rounded-md bg-grade-bg px-2 py-0.5 text-caption font-medium text-grade-text">
          {conditionLabel(listing)}
        </span>
        <CardArt name={card.name} src={card.image_url} />
      </div>

      <div className="relative z-10 mx-2 -mt-3 flex flex-col gap-0.5 rounded-md border border-border bg-bg p-2 shadow-elevated">
        <h3 className="truncate text-caption font-bold">{card.name}</h3>
        <p className="truncate text-caption text-text-secondary">{card.set_name}</p>
        <p className="mt-0.5 text-body font-bold tabular transition-colors duration-(--duration-fast) group-hover:text-primary">
          {php(listing.price)}
        </p>
      </div>
    </Link>
  );
}
