"use client";

import { useEffect, useState } from "react";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";

/**
 * The signature moment: silhouette cross-dissolving into the full-colour
 * image at event close.
 *
 * ~800ms, deliberately past the design system's 400ms ceiling — it's a
 * sanctioned celebratory exception, same class as order confirmation. The
 * answer text lands as the image completes, not before.
 *
 * `--sfx-reveal` scores it. That cue is the one asset whose original purpose
 * matches its use exactly, and it's trimmed to resolve with the dissolve.
 */
export function Silhouette({
  name,
  revealed,
  answer,
  won,
}: {
  name: string;
  revealed: boolean;
  answer?: string;
  won?: boolean;
}) {
  // Hold the silhouette for a beat before dissolving, so arriving on a closed
  // event still shows the puzzle rather than jumping straight to the answer.
  const [dissolved, setDissolved] = useState(false);

  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => {
      setDissolved(true);
      play("reveal");
    }, 400);
    return () => clearTimeout(t);
  }, [revealed]);

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-[#1a1d29]">
      {/* Full-colour art underneath. */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity ease-[cubic-bezier(0.4,0,0.2,1)]",
          dissolved ? "opacity-100" : "opacity-0",
        )}
        style={{ transitionDuration: "800ms" }}
      >
        <Art name={name} />
      </div>

      {/* Black cutout on top, fading out. */}
      <div
        className={cn(
          "absolute inset-0 grid place-items-center transition-opacity ease-[cubic-bezier(0.4,0,0.2,1)]",
          dissolved ? "opacity-0" : "opacity-100",
        )}
        style={{ transitionDuration: "800ms" }}
      >
        <SilhouetteMark name={name} />
      </div>

      {/* Answer lands as the dissolve completes. */}
      {dissolved && answer && (
        <div
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-center"
          style={{ animation: "answer-in var(--duration-slow) var(--ease-out-soft) 400ms backwards" }}
        >
          <p className="text-caption text-white/70">It&apos;s</p>
          <p className="text-display font-bold text-white capitalize">{answer}</p>
        </div>
      )}

      {won && dissolved && <Confetti />}
    </div>
  );
}

/** A solid black cutout, derived from the name so every event differs. */
function SilhouetteMark({ name }: { name: string }) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return (
    <svg viewBox="0 0 200 200" className="size-2/3" aria-label="Silhouette of the mystery gift">
      <defs>
        <radialGradient id="glow">
          <stop offset="0%" stopColor={`hsl(${h} 60% 30%)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="95" fill="url(#glow)" />
      <path
        fill="#000"
        d="M100 22c-16 0-28 10-33 24-6 3-11 9-13 16-9 4-15 13-15 24 0 8 3 15 9 20-3 6-4 13-2 20 3 12 13 21 25 24 6 10 18 17 31 17s25-7 31-17c12-3 22-12 25-24 2-7 1-14-2-20 6-5 9-12 9-20 0-11-6-20-15-24-2-7-7-13-13-16-5-14-17-24-33-24zm-22 62a9 9 0 110 18 9 9 0 010-18zm44 0a9 9 0 110 18 9 9 0 010-18zm-22 34c9 0 17 4 21 10-5 6-12 10-21 10s-16-4-21-10c4-6 12-10 21-10z"
      />
    </svg>
  );
}

function Art({ name }: { name: string }) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return (
    <div
      className="grid size-full place-items-center p-6 text-center"
      style={{
        background: `linear-gradient(150deg, hsl(${h} 70% 82%), hsl(${(h + 40) % 360} 65% 70%))`,
      }}
    >
      <span className="text-h2 font-semibold text-text-primary/60">{name}</span>
    </div>
  );
}

/**
 * A few dozen particles, once. Skipped entirely under reduced motion — the
 * spec asks for a static congrats badge instead, which the caller renders.
 */
function Confetti() {
  const pieces = Array.from({ length: 36 }, (_, i) => i);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 motion-reduce:hidden"
    >
      {pieces.map((i) => {
        const left = (i * 37) % 100;
        const delay = (i % 12) * 40;
        const hue = (i * 47) % 360;
        return (
          <span
            key={i}
            className="absolute top-0 size-2 rounded-[1px]"
            style={{
              left: `${left}%`,
              background: `hsl(${hue} 80% 60%)`,
              animation: `confetti 1200ms var(--ease-standard) ${delay}ms forwards`,
            }}
          />
        );
      })}
    </div>
  );
}
