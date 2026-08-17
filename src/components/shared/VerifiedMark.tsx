/**
 * Verified-vendor checkmark. Shared by ListingCardTile (buyer-facing listing
 * tiles) and RecommendedMatches (trade matching) — one SVG, not a duplicate
 * per surface.
 */
export function VerifiedMark() {
  return (
    <svg viewBox="0 0 20 20" className="size-3.5 shrink-0 fill-primary" aria-label="Verified vendor">
      <path d="M10 1.5l2.2 1.6 2.7-.2.9 2.6 2.2 1.6-1 2.6 1 2.6-2.2 1.6-.9 2.6-2.7-.2L10 18.5l-2.2-1.6-2.7.2-.9-2.6L2 12.9l1-2.6-1-2.6 2.2-1.6.9-2.6 2.7.2L10 1.5zm-.8 11.4l4.6-4.6-1.2-1.2-3.4 3.4-1.6-1.6-1.2 1.2 2.8 2.8z" />
    </svg>
  );
}
