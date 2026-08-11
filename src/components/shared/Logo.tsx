import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The PokeCard PH lockup: Poké Ball mark + "POKE" in ink + "CARD" in primary
 * red + "PH" underlined in red beneath.
 *
 * The brand doc references logo image assets to be saved under
 * `/design-reference/brand/`. **Those assets were not supplied**, so this is a
 * faithful CSS/SVG reconstruction from the written description — the mark's
 * geometry (Poké Ball = collect, looping arrow = connect) and the wordmark's
 * colour split are right, but it is not the real artwork. Swap the mark for
 * the supplied SVG when it arrives; the layout won't need to change.
 */
export function Logo({
  reversed = false,
  href = "/",
  compact = false,
}: {
  /** White "POKE" for use on --color-ink backgrounds. */
  reversed?: boolean;
  href?: string | null;
  /** Mark only, for tight spaces. */
  compact?: boolean;
}) {
  const inner = (
    <>
      <PokeBall />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-h3 font-bold tracking-tight">
            <span className={reversed ? "text-white" : "text-ink"}>POKE</span>
            <span className="text-primary">CARD</span>
          </span>
          <span className="mt-0.5 self-end border-b-2 border-primary text-[10px] font-bold tracking-[0.2em] text-primary">
            PH
          </span>
        </span>
      )}
    </>
  );

  const cls = cn("flex min-h-11 shrink-0 items-center gap-2");
  return href ? (
    <Link href={href} className={cls}>{inner}</Link>
  ) : (
    <span className={cls}>{inner}</span>
  );
}

/** Poké Ball mark — collect (the circle) and connect (the looping band). */
function PokeBall({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-8 shrink-0", className)} aria-hidden>
      <circle cx="20" cy="20" r="19" fill="#fff" stroke="var(--color-ink)" strokeWidth="2" />
      <path d="M1 20a19 19 0 0138 0z" fill="var(--color-primary)" />
      <path d="M1 20h38" stroke="var(--color-ink)" strokeWidth="2.5" />
      <circle cx="20" cy="20" r="6.5" fill="#fff" stroke="var(--color-ink)" strokeWidth="2.5" />
      <circle cx="20" cy="20" r="2.5" fill="var(--color-ink)" />
    </svg>
  );
}
