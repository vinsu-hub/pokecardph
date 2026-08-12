/**
 * Reading a listing's `photos` jsonb.
 *
 * The column has existed since the Phase 1 base schema but nothing wrote to it
 * until the Add Listing wizard got a real upload control, so most rows still
 * hold `[]`. Shape is whatever `<ImageUpload>` submits:
 * `[{ slot: "Front", url: "..." }, …]`.
 *
 * It's jsonb, which means it is whatever anyone ever put there — including
 * rows written before the current shape existed. These helpers narrow rather
 * than assume, so a malformed row degrades to the catalog image or the
 * gradient instead of throwing on a product page.
 */

export type ListingPhoto = { slot: string; url: string };

export function listingPhotos(photos: unknown): ListingPhoto[] {
  if (!Array.isArray(photos)) return [];
  return photos.filter(
    (p): p is ListingPhoto =>
      typeof p === "object" &&
      p !== null &&
      typeof (p as ListingPhoto).url === "string" &&
      (p as ListingPhoto).url.length > 0,
  );
}

/**
 * The image to lead with: the vendor's own Front photo if they uploaded one,
 * else any photo they did upload, else null so the caller falls back to the
 * shared catalog art. A vendor's photo of the actual item they're selling
 * always outranks the catalog's stock image of that card.
 */
export function primaryPhoto(photos: unknown): string | null {
  const list = listingPhotos(photos);
  if (!list.length) return null;
  const front = list.find((p) => p.slot.toLowerCase().startsWith("front"));
  return (front ?? list[0]).url;
}

/**
 * Test-only normal maps produced by `.dev/prep-cards.mjs` from the supplied
 * card images, keyed by the front albedo path they were derived from. These
 * are NOT measured — see the label in Inspector3D. Real Stage 4 capture will
 * replace this lookup with `listings.normal_map_url`, at which point this map
 * goes away rather than growing.
 */
const TEST_NORMAL_MAPS: Record<string, string> = {
  "/cards/mew-ex-151-front.webp": "/cards/mew-ex-151-front-normal.webp",
  "/cards/umbreon-vmax-front.webp": "/cards/umbreon-vmax-front-normal.webp",
  "/cards/leafeon-vstar-front.webp": "/cards/leafeon-vstar-front-normal.webp",
  "/cards/gengar-vmax-front.webp": "/cards/gengar-vmax-front-normal.webp",
};

export function testNormalMapFor(albedo: string | null): string | null {
  return albedo ? (TEST_NORMAL_MAPS[albedo] ?? null) : null;
}

/**
 * `…-front.webp` -> `…-back.webp` by naming convention, for the handful of
 * `/cards/*` test images that have both. Anything that doesn't match the
 * convention returns null rather than guessing.
 */
export function testBackFor(albedo: string | null): string | null {
  if (!albedo || !albedo.startsWith("/cards/") || !albedo.includes("-front.")) return null;
  return albedo.replace("-front.", "-back.");
}

/**
 * Card Detail's 4-thumbnail gallery slots, in display order. The spec's
 * labels (Front/Back/Detail/Certification) don't match `<ImageUpload>`'s
 * real slot keys (`AddListingWizard.tsx`'s `PHOTO_SLOTS`) one-for-one — this
 * is the one place that mapping lives, so the gallery component doesn't
 * re-derive it.
 */
const GALLERY_SLOTS: { label: string; slotKey: string }[] = [
  { label: "Front", slotKey: "Front" },
  { label: "Back", slotKey: "Back" },
  { label: "Detail", slotKey: "Close-up" },
  { label: "Certification", slotKey: "Slab / Label" },
];

export type GallerySlot = { label: string; url: string | null };

/**
 * The 4 gallery slots resolved against a listing's uploaded photos, falling
 * back to the catalog's front/back art for the first two when the vendor
 * hasn't uploaded their own — Detail/Certification have no catalog
 * equivalent, so they stay null (hidden thumbnail) until a vendor uploads
 * one.
 */
export function gallerySlots(photos: unknown, catalogFront: string | null): GallerySlot[] {
  const uploaded = listingPhotos(photos);
  const catalogBack = testBackFor(catalogFront);
  return GALLERY_SLOTS.map(({ label, slotKey }) => {
    const match = uploaded.find((p) => p.slot === slotKey);
    if (match) return { label, url: match.url };
    if (slotKey === "Front") return { label, url: catalogFront };
    if (slotKey === "Back") return { label, url: catalogBack };
    return { label, url: null };
  });
}
