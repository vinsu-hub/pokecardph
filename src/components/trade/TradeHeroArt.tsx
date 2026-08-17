import { RefreshCw, Sparkle } from "lucide-react";
import { CardArt } from "@/components/buyer/CardArt";

/**
 * Trade Hub hero illustration — two tilted, overlapping cards with a swap
 * icon between them. Recreates Trade Header.png's composition (same layout:
 * left card leaning one way, right card leaning the other, swap glyph and
 * sparkle accents in between) using real PokeCard PH card photography and
 * the locked red brand accent, not the reference's purple icon and unrelated
 * stock cards — the design system wins over a reference image on conflict
 * (AGENTS.md). Static: no cursor tracking, unlike ShelfCardTilt, which is
 * built for a different job (hover-interactive shelf rows).
 */
export function TradeHeroArt() {
  return (
    <div className="relative mx-auto hidden h-[220px] w-[300px] shrink-0 sm:block">
      <div className="absolute top-2 left-0 w-[150px] -rotate-[8deg]">
        <div className="relative aspect-[5/7] overflow-hidden rounded-lg border border-border bg-bg-muted shadow-elevated">
          <CardArt name="Mew ex" src="/cards/mew-ex-151-front.webp" sizes="150px" />
        </div>
      </div>
      <div className="absolute top-6 right-0 w-[150px] rotate-[6deg]">
        <div className="relative aspect-[5/7] overflow-hidden rounded-lg border border-border bg-bg-muted shadow-elevated">
          <CardArt name="Umbreon VMAX" src="/cards/umbreon-vmax-front.webp" sizes="150px" />
        </div>
      </div>

      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-white shadow-elevated"
      >
        <RefreshCw className="size-5" />
      </span>

      <Sparkle aria-hidden className="absolute top-0 left-[120px] size-4 text-primary/70" />
      <Sparkle aria-hidden className="absolute right-2 bottom-6 size-3 text-primary/50" />
      <Sparkle aria-hidden className="absolute bottom-0 left-6 size-3.5 text-primary/60" />
    </div>
  );
}
