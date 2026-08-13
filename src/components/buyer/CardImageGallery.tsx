"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { conditionLabel, type ListingCard } from "@/lib/supabase/types";
import { gallerySlots } from "@/lib/photos";
import { CardArt } from "./CardArt";

/**
 * Card Detail's image panel: hero (frame, zoom, left/right arrow nav) + a
 * 4-thumb strip (Front/Back/Detail/Certification). Active thumbnail gets a
 * `border-primary` ring — that token is Pokémon red (`#e4002b`), so this is
 * the reference image's "active = red border" via the existing design
 * system, not a new color.
 */
export function CardImageGallery({ listing }: { listing: ListingCard }) {
  const { cards: card } = listing;
  const slots = gallerySlots(listing.photos, card.image_url);
  const available = slots.filter((s) => s.url) as { label: string; url: string }[];
  const [activeIdx, setActiveIdx] = useState(0);

  const hero = (
    <span className="absolute top-3 left-3 z-10 rounded-md bg-grade-bg px-2.5 py-1 text-caption font-medium text-grade-text">
      {conditionLabel(listing)}
    </span>
  );

  if (available.length === 0) {
    return (
      <div className="relative mt-3 mx-auto aspect-[5/7] w-full max-w-[400px] max-h-[560px] overflow-hidden rounded-lg border border-border">
        {hero}
        <CardArt name={card.name} src={null} priority sizes="(min-width: 1024px) 40vw, 90vw" />
      </div>
    );
  }

  const active = available[Math.min(activeIdx, available.length - 1)];

  function go(delta: number) {
    setActiveIdx((i) => (i + delta + available.length) % available.length);
  }

  return (
    <div>
      <div className="relative mt-3 mx-auto aspect-[5/7] w-full max-w-[400px] max-h-[560px] overflow-hidden rounded-lg border border-border">
        {hero}
        <CardArt
          name={`${card.name} — ${active.label}`}
          src={active.url}
          priority
          sizes="(min-width: 1024px) 40vw, 90vw"
        />

        {available.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute top-1/2 left-2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-bg/80 text-text-primary shadow-rest backdrop-blur transition-colors duration-(--duration-instant) hover:bg-bg"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute top-1/2 right-2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-bg/80 text-text-primary shadow-rest backdrop-blur transition-colors duration-(--duration-instant) hover:bg-bg"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}

        <a
          href={active.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View full size"
          className="absolute right-2 bottom-2 z-10 grid size-11 place-items-center rounded-full bg-bg/80 text-text-primary shadow-rest backdrop-blur transition-colors duration-(--duration-instant) hover:bg-bg"
        >
          <Maximize2 className="size-4" />
        </a>
      </div>

      <ul className="mt-3 flex justify-center gap-2">
        {available.map((s, idx) => (
          <li key={s.label}>
            <button
              onClick={() => setActiveIdx(idx)}
              aria-label={s.label}
              aria-pressed={idx === activeIdx}
              className={cn(
                "relative size-14 overflow-hidden rounded-md border-2 transition-colors duration-(--duration-instant)",
                idx === activeIdx ? "border-primary" : "border-border",
              )}
            >
              <CardArt name={s.label} src={s.url} sizes="56px" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
