"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * 3D Inspection.
 * Reference: REFERENCE IMAGES/ITEM VIEW WITH 3D MODEL VIEW.png
 *
 * Six angles, three lighting presets, drag-to-rotate. Built with CSS 3D
 * transforms rather than Three.js: the reference shows a slabbed card being
 * turned, which is a rigid rectangular solid — a full WebGL scene would add a
 * heavy dependency for a shape that CSS renders exactly. The photometric
 * normal-map pipeline this is meant to display doesn't exist yet, so the faces
 * are placeholders.
 *
 * Deliberately NOT built: the AR View button in the mockup. It appears in no
 * spec and no schema, so it stays out rather than becoming a dead control.
 */

const ANGLES = [
  { key: "front", label: "Front", rx: 0, ry: 0 },
  { key: "back", label: "Back", rx: 0, ry: 180 },
  { key: "left", label: "Left", rx: 0, ry: -62 },
  { key: "right", label: "Right", rx: 0, ry: 62 },
  { key: "top", label: "Top", rx: 62, ry: 0 },
  { key: "bottom", label: "Bottom", rx: -62, ry: 0 },
] as const;

const LIGHTING = [
  { key: "studio", label: "Studio", note: "Clean and bright lighting",
    bg: "radial-gradient(circle at 50% 25%, #2c3245 0%, #10131c 70%)", glare: 0.35 },
  { key: "spotlight", label: "Spotlight", note: "Directional spotlight effect",
    bg: "radial-gradient(circle at 30% 15%, #3d4560 0%, #080a10 65%)", glare: 0.6 },
  { key: "dark", label: "Dark Room", note: "Low light for holographic view",
    bg: "radial-gradient(circle at 50% 50%, #14161f 0%, #05060a 80%)", glare: 0.85 },
] as const;

export function Inspector3D({ name }: { name: string }) {
  const [angle, setAngle] = useState<(typeof ANGLES)[number]["key"]>("front");
  const [light, setLight] = useState<(typeof LIGHTING)[number]["key"]>("studio");
  const [zoom, setZoom] = useState(1);
  const [drag, setDrag] = useState<{ rx: number; ry: number } | null>(null);

  const preset = ANGLES.find((a) => a.key === angle)!;
  const lighting = LIGHTING.find((l) => l.key === light)!;
  const rx = drag ? drag.rx : preset.rx;
  const ry = drag ? drag.ry : preset.ry;

  function onPointerMove(e: React.PointerEvent) {
    if (e.buttons !== 1) return;
    setDrag((d) => ({
      rx: Math.max(-80, Math.min(80, (d?.rx ?? preset.rx) - e.movementY * 0.5)),
      ry: (d?.ry ?? preset.ry) + e.movementX * 0.5,
    }));
  }

  return (
    <div className="grid gap-4">
      {/* ---- Viewer ---- */}
      <div
        onPointerMove={onPointerMove}
        onDoubleClick={() => { setDrag(null); setAngle("front"); setZoom(1); }}
        onWheel={(e) => setZoom((z) => Math.max(0.6, Math.min(2, z - e.deltaY * 0.001)))}
        className="relative aspect-[16/10] cursor-grab overflow-hidden rounded-lg active:cursor-grabbing"
        style={{ background: lighting.bg, perspective: "1400px" }}
      >
        <div
          className="absolute inset-0 grid place-items-center transition-transform duration-(--duration-base) ease-(--ease-out-soft)"
          style={{
            transform: `rotateX(${rx}deg) rotateY(${ry}deg) scale(${zoom})`,
            transformStyle: "preserve-3d",
          }}
        >
          <Slab name={name} glare={lighting.glare} />
        </div>

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
    </div>
  );
}

/** A slabbed card as a rigid solid — front, back and four edges. */
function Slab({ name, glare }: { name: string; glare: number }) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  const depth = 10;

  return (
    <div
      className="relative h-[62%] w-[30%] min-w-[150px]"
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Front */}
      <div
        className="absolute inset-0 overflow-hidden rounded-md border border-white/20"
        style={{
          transform: `translateZ(${depth / 2}px)`,
          background: `linear-gradient(150deg, hsl(${h} 70% 84%), hsl(${(h + 40) % 360} 65% 68%))`,
        }}
      >
        <div className="grid h-full place-items-center p-3 text-center">
          <span className="text-caption font-medium text-text-primary/60">{name}</span>
        </div>
        {/* Holographic sweep — the thing lighting presets exist to show. */}
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, transparent 30%, rgba(255,255,255,.9) 48%, transparent 62%)",
            opacity: glare,
          }}
        />
      </div>

      {/* Back */}
      <div
        className="absolute inset-0 rounded-md border border-white/20 bg-gradient-to-br from-indigo-700 to-indigo-900"
        style={{ transform: `rotateY(180deg) translateZ(${depth / 2}px)` }}
      />

      {/* Edges */}
      {[
        { t: `rotateY(90deg) translateZ(calc(50% - ${depth / 2}px))`, cls: "inset-y-0 right-0 w-[10px]" },
        { t: `rotateY(-90deg) translateZ(calc(50% - ${depth / 2}px))`, cls: "inset-y-0 left-0 w-[10px]" },
        { t: `rotateX(90deg) translateZ(calc(50% - ${depth / 2}px))`, cls: "inset-x-0 top-0 h-[10px]" },
        { t: `rotateX(-90deg) translateZ(calc(50% - ${depth / 2}px))`, cls: "inset-x-0 bottom-0 h-[10px]" },
      ].map((e, i) => (
        <div
          key={i}
          className={cn("absolute bg-slate-200/90", e.cls)}
          style={{ transform: e.t }}
        />
      ))}
    </div>
  );
}
