"use client";

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { SurfaceLighting } from "./CardSurface";

/**
 * 3D Inspection.
 * Reference: REFERENCE IMAGES/ITEM VIEW WITH 3D MODEL VIEW.png
 * Spec: POKECARD_PH_PHASE7_SCAN_3D.md §4.3
 *
 * The page chrome comes from the reference image — angle filmstrip, tool rail,
 * lighting presets, side chevrons. The thing inside the frame comes from the
 * spec, and the two disagree: the mockup shows a card being *rotated*, while
 * the spec calls for a flat plane under a *moving light*. The spec wins on
 * mechanic (it's the feature that shows condition), the mockup wins on layout.
 * So the surrounding controls all still work, but they now drive light and
 * tilt on a real WebGL surface instead of a CSS transform.
 *
 * Three.js is loaded only when this component mounts (§7) — it is not worth
 * shipping to every Card Detail view when most listings have no scan.
 *
 * Deliberately NOT built: the AR View button in the mockup. It appears in no
 * spec and no schema, so it stays out rather than becoming a dead control.
 */

const CardSurface = dynamic(() => import("./CardSurface"), {
  ssr: false,
  loading: () => <ViewerSkeleton />,
});

/** Tilt only — the plane never turns far enough to present its edge, because
 *  an edge-on plane has no surface to light. Front/Back swap the texture
 *  instead of spinning through 180°. */
const ANGLES = [
  { key: "front", label: "Front", rx: 0, ry: 0 },
  { key: "back", label: "Back", rx: 0, ry: 0 },
  { key: "left", label: "Left", rx: 0, ry: -24 },
  { key: "right", label: "Right", rx: 0, ry: 24 },
  { key: "top", label: "Top", rx: 20, ry: 0 },
  { key: "bottom", label: "Bottom", rx: -20, ry: 0 },
] as const;

const LIGHTING = [
  { key: "studio", label: "Studio", note: "Clean and bright lighting",
    bg: "radial-gradient(circle at 50% 25%, #2c3245 0%, #10131c 70%)",
    ambient: 0.55, intensity: 26, color: "#ffffff" },
  { key: "spotlight", label: "Spotlight", note: "Directional spotlight effect",
    bg: "radial-gradient(circle at 30% 15%, #3d4560 0%, #080a10 65%)",
    ambient: 0.22, intensity: 44, color: "#fff6e8" },
  { key: "dark", label: "Dark Room", note: "Low light for holographic view",
    bg: "radial-gradient(circle at 50% 50%, #14161f 0%, #05060a 80%)",
    ambient: 0.06, intensity: 58, color: "#dce8ff" },
] as const;

function ViewerSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#10131c]">
      <div className="h-2/3 w-[22%] animate-pulse rounded-md bg-white/10" />
    </div>
  );
}

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M10 2l6.5 2.5v4.8c0 4.3-2.7 8-6.5 9.2-3.8-1.2-6.5-4.9-6.5-9.2V4.5L10 2z" strokeLinejoin="round" />
      <path d="M7 10l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Inspector3D({
  name,
  albedo,
  normal,
  backAlbedo,
  scanTier,
}: {
  name: string;
  /** Front face texture. Null when the listing has no usable image at all. */
  albedo: string | null;
  /** Surface normals. Null renders a flat-lit card — still correct, just
   *  without relief, which is the honest result for an unscanned listing. */
  normal: string | null;
  backAlbedo: string | null;
  /** The listing's real scan_tier column — independent of whether `normal`
   *  happens to be populated from the test-only artwork-derived lookup below.
   *  A listing can be scanTier="flat" (no normal, warning badge) while a
   *  *different* concern — the hardcoded test cards — separately has a
   *  derived normal map with its own caveat. The two never get conflated. */
  scanTier: "flat" | "full" | null;
}) {
  const [angle, setAngle] = useState<(typeof ANGLES)[number]["key"]>("front");
  const [light, setLight] = useState<(typeof LIGHTING)[number]["key"]>("studio");
  const [zoom, setZoom] = useState(1);
  const [drag, setDrag] = useState<{ rx: number; ry: number } | null>(null);

  const preset = ANGLES.find((a) => a.key === angle)!;
  const lighting = LIGHTING.find((l) => l.key === light)!;
  const rx = drag ? drag.rx : preset.rx;
  const ry = drag ? drag.ry : preset.ry;

  // Back view swaps the texture rather than rotating through 180°, and falls
  // back to the front when a listing has no back photo — most don't.
  const face = angle === "back" ? (backAlbedo ?? albedo) : albedo;

  const surfaceLighting: SurfaceLighting = {
    ambient: lighting.ambient,
    intensity: lighting.intensity,
    color: lighting.color,
    background: lighting.bg,
  };

  // Drag tilts the plane. Clamped much tighter than a rotating card would be:
  // past ~35° a plane starts presenting its edge, and an edge-on plane has no
  // lit surface left to inspect.
  function onPointerMove(e: React.PointerEvent) {
    if (e.buttons !== 1) return;
    setDrag((d) => ({
      rx: Math.max(-35, Math.min(35, (d?.rx ?? preset.rx) - e.movementY * 0.25)),
      ry: Math.max(-35, Math.min(35, (d?.ry ?? preset.ry) + e.movementX * 0.25)),
    }));
  }

  return (
    <div className="grid gap-4">
      {/* Two-tier scanning badge — independent of the viewer itself. A Flat
          Scan still gets a real, working viewer (flat-lit, no relief); the
          badge is about setting the right expectation for what the surface
          detail can and can't show, not about gating the feature. */}
      {scanTier === "full" && (
        <p className="flex items-center gap-2 rounded-md bg-success-bg px-3 py-2 text-caption font-medium text-success">
          <ShieldCheckIcon />
          Platform Verified Condition — multi-angle scan on file for this listing.
        </p>
      )}
      {scanTier === "flat" && (
        <p className="rounded-md bg-attention-bg px-3 py-2 text-caption text-attention">
          <span className="font-medium">Flat Scan.</span> This 3D view is generated
          from a single photo — surface condition (scratches, whitening, gloss)
          may not be visible. The vendor&apos;s written description and stated
          grade are authoritative.
        </p>
      )}

      {/* ---- Viewer ---- */}
      <div
        onPointerMove={onPointerMove}
        onDoubleClick={() => { setDrag(null); setAngle("front"); setZoom(1); }}
        onWheel={(e) => setZoom((z) => Math.max(0.6, Math.min(2, z - e.deltaY * 0.001)))}
        className="relative aspect-[16/10] cursor-crosshair overflow-hidden rounded-lg"
        style={{ background: lighting.bg }}
      >
        {face ? (
          <Suspense fallback={<ViewerSkeleton />}>
            <CardSurface
              albedo={face}
              normal={angle === "back" ? null : normal}
              tiltX={rx}
              tiltY={ry}
              zoom={zoom}
              lighting={surfaceLighting}
              className="absolute inset-0"
            />
          </Suspense>
        ) : (
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <p className="text-body text-white/70">
              No photo for {name} yet, so there is no surface to light.
            </p>
          </div>
        )}

        <p className="pointer-events-none absolute inset-x-0 top-3 z-10 text-center text-caption text-white/70">
          Move your mouse to light the card
        </p>

        {/* Angle nudge arrows, matching the reference's side chevrons. */}
        <button
          onClick={() => { setDrag(null); setAngle("left"); }}
          aria-label="Rotate left"
          className="absolute top-1/2 left-4 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur"
        >
          ‹
        </button>
        <button
          onClick={() => { setDrag(null); setAngle("right"); }}
          aria-label="Rotate right"
          className="absolute top-1/2 right-4 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur"
        >
          ›
        </button>

        {/* Vertical tool rail */}
        <div className="absolute top-1/2 right-4 flex -translate-y-1/2 translate-x-16 flex-col gap-1 rounded-lg bg-black/60 p-1 backdrop-blur sm:translate-x-0 sm:right-4">
          {[
            ["☀", "Light", () => setLight(light === "dark" ? "studio" : light === "studio" ? "spotlight" : "dark")],
            ["⊕", "Zoom", () => setZoom((z) => (z >= 1.8 ? 0.8 : z + 0.4))],
            ["⇄", "Flip", () => { setDrag(null); setAngle(angle === "front" ? "back" : "front"); }],
            ["⟲", "Reset", () => { setDrag(null); setAngle("front"); setZoom(1); }],
          ].map(([icon, label, fn]) => (
            <button
              key={label as string}
              onClick={fn as () => void}
              className="grid size-11 place-items-center rounded-md text-caption text-white hover:bg-white/10"
            >
              <span aria-hidden className="text-body">{icon as string}</span>
              <span className="sr-only">{label as string}</span>
            </button>
          ))}
        </div>

        {/* Angle filmstrip */}
        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 overflow-x-auto bg-gradient-to-t from-black/70 to-transparent p-3">
          {ANGLES.map((a) => (
            <button
              key={a.key}
              onClick={() => { setDrag(null); setAngle(a.key); }}
              aria-pressed={angle === a.key && !drag}
              className={cn(
                "flex h-16 min-w-11 shrink-0 flex-col items-center justify-end rounded-md border-2 px-2 pb-1 text-[10px] font-medium",
                angle === a.key && !drag
                  ? "border-primary bg-primary/20 text-white"
                  : "border-white/20 text-white/70",
              )}
            >
              <span className="mb-1 block h-7 w-5 rounded-[2px] bg-gradient-to-br from-slate-300 to-slate-500" />
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Angles / guide / lighting, per the reference's bottom row ---- */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
          <h3 className="text-caption font-medium tracking-wide text-primary uppercase">
            3D View Angles
          </h3>
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {ANGLES.map((a) => (
              <li key={a.key}>
                <button
                  onClick={() => { setDrag(null); setAngle(a.key); }}
                  className={cn(
                    "flex w-full flex-col items-center gap-1 rounded-md border p-2",
                    angle === a.key && !drag ? "border-primary bg-primary-subtle" : "border-border",
                  )}
                >
                  <span className="block h-10 w-7 rounded-[2px] bg-gradient-to-br from-slate-200 to-slate-400" />
                  <span className="text-caption">{a.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
          <h3 className="text-caption font-medium tracking-wide text-primary uppercase">
            Interaction Guide
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {[
              ["Drag to rotate", "Click and drag to rotate the card"],
              ["Scroll to zoom", "Use the mouse wheel to zoom in and out"],
              ["Double click to reset", "Returns the card to front view"],
              ["Toggle light", "Adjust lighting for a better view"],
            ].map(([t, d]) => (
              <li key={t}>
                <p className="text-body font-medium">{t}</p>
                <p className="text-caption text-text-secondary">{d}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
          <h3 className="text-caption font-medium tracking-wide text-primary uppercase">
            Lighting Presets
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {LIGHTING.map((l) => (
              <li key={l.key}>
                <button
                  onClick={() => setLight(l.key)}
                  aria-pressed={light === l.key}
                  className={cn(
                    "w-full rounded-md border p-3 text-left",
                    light === l.key ? "border-primary bg-primary-subtle" : "border-border",
                  )}
                >
                  <span className="block text-body font-medium">{l.label}</span>
                  <span className="block text-caption text-text-secondary">{l.note}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {normal && (
        <p className="rounded-md bg-attention-bg px-3 py-2 text-caption text-attention">
          This surface relief is derived from the card&apos;s artwork for testing the
          viewer — it is not a condition scan and does not reflect this physical
          card&apos;s actual surface. See real scan status on the listing itself.
        </p>
      )}
    </div>
  );
}
