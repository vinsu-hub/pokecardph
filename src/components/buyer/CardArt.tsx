import Image from "next/image";

/**
 * Card artwork, with the gradient placeholder as its fallback.
 *
 * Lifted out of ListingCardTile once real images existed. Most of the catalog
 * still has none — real card scans raise the same licensing question as the
 * audio assets — so the fallback isn't a temporary state to be cleaned up
 * later, it's the normal case for any card nobody has photographed. It stays a
 * *stable* per-card gradient rather than a grey box or a broken-image icon: a
 * grid of them reads as deliberate, and the same card looks the same
 * everywhere it appears.
 */
export function CardArt({
  name,
  src,
  priority = false,
  sizes = "(min-width: 1024px) 20vw, 45vw",
}: {
  name: string;
  src?: string | null;
  /** Set on above-the-fold art — the first row of a grid, or a detail hero. */
  priority?: boolean;
  sizes?: string;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    );
  }

  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return (
    <div
      className="absolute inset-0 grid place-items-center p-3 text-center"
      style={{
        background: `linear-gradient(150deg, hsl(${h} 70% 88%), hsl(${(h + 40) % 360} 65% 78%))`,
      }}
    >
      <span className="text-caption font-medium text-text-primary/60">{name}</span>
    </div>
  );
}
