"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Scan & Grade capture studio.
 * Reference: REFERENCE IMAGES/VENDOR SCAN OR UPLOAD ITEM.png
 *
 * Six captures, one per angle. Camera access is NOT wired — this is the
 * capture shell with its real state machine (which step, what's shot, what's
 * left); the frames it produces are placeholders. The disclaimer says so, and
 * so does the panel.
 *
 * The scan supports the vendor's stated grade and never overrides it. There is
 * deliberately no auto-grading model — that's the product's trust proposition,
 * not a technical shortfall.
 *
 * Scanning is now mandatory to publish, but tiered — not a hard gate through
 * this page. A vendor's Front photo from the listing wizard already satisfies
 * the Flat Scan tier by itself, so there's nothing to "skip" here in the sense
 * of leaving a requirement unmet. This page is the opt-in upgrade path to the
 * Full Condition Scan tier (a real normal map, a verified badge, no warning
 * badge on the listing) — completing it doesn't write anything yet, since the
 * capture and photometric processing behind it aren't built.
 */

export const SCAN_STEPS = [
  { key: "front-center", label: "Front – Center", title: "Front – Center",
    hint: "Lay the card flat and centre it inside the frame." },
  { key: "front-tilt-left", label: "Front – Tilt Left", title: "Tilt – Left",
    hint: "Slowly tilt the card to the left until the light reflects across the surface." },
  { key: "front-tilt-right", label: "Front – Tilt Right", title: "Tilt – Right",
    hint: "Now tilt the other way, letting the light sweep back across." },
  { key: "edges", label: "Top & Bottom Edges", title: "Top & Bottom Edges",
    hint: "Angle the card to show its edges — whitening shows up here first." },
  { key: "back", label: "Back of Card", title: "Back of Card",
    hint: "Flip the card and centre the back in the frame." },
  { key: "surface", label: "Surface Close-up", title: "Surface Close-up",
    hint: "Move in close on the surface so scratches and print lines are visible." },
] as const;

export function ScanStudio({
  onSkipHref,
  flatTierSatisfied,
}: {
  onSkipHref: string;
  /** Whether this listing already has a Front photo (or a completed scan) —
   *  true means Flat Scan is already satisfied and this page is purely an
   *  optional upgrade; false means the vendor still needs a photo before
   *  they can publish at all, scan or no scan. */
  flatTierSatisfied: boolean;
}) {
  const [step, setStep] = useState(0);
  const [captured, setCaptured] = useState<number[]>([]);
  const [flash, setFlash] = useState(false);
  const [autoGuide, setAutoGuide] = useState(true);
  const [zoom, setZoom] = useState("1x");
  const [rotated, setRotated] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const current = SCAN_STEPS[step];
  const done = captured.length;
  const remaining = SCAN_STEPS.length - done;

  function capture() {
    if (!captured.includes(step)) setCaptured((c) => [...c, step]);
    if (step < SCAN_STEPS.length - 1) setStep((s) => s + 1);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      {/* ---------------- Camera viewport ---------------- */}
      <div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#0b0d13]">
          {/* Top controls */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4">
            <button
              onClick={() => setFlash((f) => !f)}
              aria-pressed={flash}
              className="flex h-11 items-center gap-2 rounded-md bg-white/10 px-3 text-caption font-medium text-white backdrop-blur"
            >
              ⚡ Flash {flash ? "On" : "Off"}
            </button>
            <button
              onClick={() => setAutoGuide((a) => !a)}
              aria-pressed={autoGuide}
              className={cn(
                "flex h-11 items-center gap-2 rounded-md px-3 text-caption font-medium backdrop-blur",
                autoGuide ? "bg-primary text-white" : "bg-white/10 text-white",
              )}
            >
              ⊹ Auto Guide
            </button>
          </div>

          {/* Corner framing brackets */}
          {autoGuide && (
            <div aria-hidden className="absolute inset-[12%] z-10">
              {(["tl", "tr", "bl", "br"] as const).map((c) => (
                <span
                  key={c}
                  className={cn(
                    "absolute size-10 border-white/70",
                    c === "tl" && "top-0 left-0 border-t-2 border-l-2",
                    c === "tr" && "top-0 right-0 border-t-2 border-r-2",
                    c === "bl" && "bottom-0 left-0 border-b-2 border-l-2",
                    c === "br" && "right-0 bottom-0 border-r-2 border-b-2",
                  )}
                />
              ))}
              {/* Centre crosshair */}
              <span className="absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50" />
              <span className="absolute top-1/2 left-0 h-px w-full bg-white/20" />
              <span className="absolute top-0 left-1/2 h-full w-px bg-white/20" />
            </div>
          )}

          {/* Card preview stand-in */}
          <div className="absolute inset-0 grid place-items-center">
            <div
              className="h-3/5 w-2/5 rounded-md bg-gradient-to-br from-slate-200 to-slate-400 shadow-2xl transition-transform duration-(--duration-base)"
              style={{
                transform: `rotate(${rotated ? 90 : 0}deg) scale(${
                  zoom === "0.5" ? 0.6 : zoom === "2" ? 1.35 : 1
                })`,
              }}
            />
          </div>

          {/* Preview overlay — the captures taken so far, per the "◎ Preview"
              button's own tooltip. */}
          {previewOpen && (
            <div className="absolute inset-0 z-30 flex flex-col bg-[#0b0d13]/95 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-body font-medium text-white">
                  Captures so far ({done}/{SCAN_STEPS.length})
                </h3>
                <button
                  onClick={() => setPreviewOpen(false)}
                  aria-label="Close preview"
                  className="grid size-11 place-items-center rounded-md text-white/80 hover:bg-white/10"
                >
                  ✕
                </button>
              </div>
              {done === 0 ? (
                <p className="mt-6 text-center text-body text-white/60">
                  No captures yet — tap Capture to take your first shot.
                </p>
              ) : (
                <ul className="mt-4 grid grid-cols-3 gap-3 overflow-y-auto">
                  {captured.map((i) => (
                    <li key={i} className="flex flex-col gap-1">
                      <div className="aspect-[4/3] rounded-md bg-gradient-to-br from-slate-300 to-slate-500" />
                      <span className="text-caption text-white/70">{SCAN_STEPS[i].label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Zoom */}
          <div className="absolute bottom-28 left-1/2 z-20 flex -translate-x-1/2 gap-1 rounded-full bg-black/60 p-1 backdrop-blur">
            {["0.5", "1x", "2"].map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                aria-pressed={zoom === z}
                className={cn(
                  "h-9 min-w-11 rounded-full px-3 text-caption font-medium",
                  zoom === z ? "bg-white text-text-primary" : "text-white",
                )}
              >
                {z}
              </button>
            ))}
          </div>

          {/* Last capture thumbnail */}
          {done > 0 && (
            <div className="absolute bottom-6 left-6 z-20 size-14 overflow-hidden rounded-md border-2 border-white/40 bg-gradient-to-br from-slate-300 to-slate-500" />
          )}

          {/* Rotate */}
          <button
            onClick={() => setRotated((r) => !r)}
            className="absolute right-6 bottom-6 z-20 grid size-14 place-items-center rounded-md bg-white/10 text-caption text-white backdrop-blur"
          >
            ⟳<span className="sr-only">Rotate</span>
          </button>

          {/* Capture bar */}
          <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-8 bg-gradient-to-t from-black/80 to-transparent pb-4 pt-8">
            <button
              onClick={capture}
              className="flex h-11 flex-col items-center justify-center px-3 text-caption font-medium text-primary"
            >
              📷 Capture
            </button>
            <button
              onClick={capture}
              aria-label="Capture"
              className="size-16 rounded-full border-4 border-white/70 bg-white transition-transform duration-(--duration-instant) active:scale-95"
            />
            <button
              onClick={() => setPreviewOpen((p) => !p)}
              aria-pressed={previewOpen}
              className="flex h-11 flex-col items-center justify-center px-3 text-caption font-medium text-white/80"
              title="Preview shows the captures taken so far"
            >
              ◎ Preview
            </button>
          </div>
        </div>

        {/* Disclaimer — the scan is reference only, never a grade. */}
        <div className="mt-4 flex gap-3 rounded-lg border border-border bg-bg p-4">
          <span aria-hidden className="text-h3">🛡️</span>
          <p className="text-body text-text-secondary">
            <span className="font-medium text-text-primary">Important:</span> this
            is an AI-assisted scan to help you estimate condition. Results are for
            reference only — final grading and authenticity are not guaranteed by
            PokeCard PH, and your stated grade always takes precedence.
          </p>
        </div>
      </div>

      {/* ---------------- Right rail ---------------- */}
      <aside className="flex flex-col gap-4">
        <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-h3 font-semibold">Scanning Progress</h2>
            <span className="text-caption text-text-secondary tabular">
              Step {step + 1} of {SCAN_STEPS.length}
            </span>
          </div>

          {/* Dot stepper */}
          <ol className="mt-4 flex items-center">
            {SCAN_STEPS.map((s, i) => (
              <li key={s.key} className="flex flex-1 items-center last:flex-none">
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full border-2 text-[10px] font-medium",
                    captured.includes(i)
                      ? "border-primary bg-primary text-white"
                      : i === step
                        ? "border-primary text-primary"
                        : "border-border text-text-muted",
                  )}
                >
                  {captured.includes(i) ? "✓" : i === step ? "●" : ""}
                </span>
                {i < SCAN_STEPS.length - 1 && (
                  <span className={cn("h-0.5 flex-1", captured.includes(i) ? "bg-primary" : "bg-border")} />
                )}
              </li>
            ))}
          </ol>

          <h3 className="mt-4 text-h3 font-semibold">{current.title}</h3>
          <p className="mt-1 text-body text-text-secondary">{current.hint}</p>

          {/* Instruction diagram */}
          <div className="mt-3 grid h-32 place-items-center rounded-md bg-bg-muted">
            <div
              className="h-20 w-14 rounded bg-gradient-to-br from-slate-300 to-slate-500 shadow-lg"
              style={{
                transform:
                  current.key === "front-tilt-left" ? "rotateY(35deg) rotateZ(-8deg)"
                  : current.key === "front-tilt-right" ? "rotateY(-35deg) rotateZ(8deg)"
                  : current.key === "edges" ? "rotateX(60deg)"
                  : current.key === "back" ? "rotateY(180deg)"
                  : current.key === "surface" ? "scale(1.3)"
                  : "none",
              }}
            />
          </div>

          <p className="mt-3 rounded-md bg-primary-subtle px-3 py-2 text-caption text-text-secondary">
            <span className="font-medium text-primary">Tip:</span> move slowly and
            keep the card within the frame.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
          <h2 className="text-h3 font-semibold">Steps Overview</h2>
          <ol className="mt-3 flex flex-col">
            {SCAN_STEPS.map((s, i) => (
              <li key={s.key}>
                <button
                  onClick={() => setStep(i)}
                  className="flex h-11 w-full items-center gap-3 rounded-md px-1 text-left"
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border-2 text-[10px] font-medium",
                      captured.includes(i)
                        ? "border-primary bg-primary text-white"
                        : i === step
                          ? "border-primary text-primary"
                          : "border-border text-text-muted",
                    )}
                  >
                    {captured.includes(i) ? "✓" : i + 1}
                  </span>
                  <span
                    className={cn(
                      "text-body",
                      i === step ? "font-medium text-primary" : "text-text-secondary",
                    )}
                  >
                    {s.label}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex items-center gap-3 rounded-lg border border-border bg-primary-subtle p-4">
          <span aria-hidden className="text-h2">⏱</span>
          <div>
            <p className="text-caption text-text-secondary">Estimated time remaining</p>
            <p className="text-h2 font-bold tabular">~{Math.max(1, remaining) * 20}s</p>
            <p className="text-caption text-text-secondary">for optimal scan results</p>
          </div>
        </section>

        {/* Scanning is mandatory but tiered, not a hard gate on this specific
            page — a Front photo already satisfies Flat Scan on its own, so
            "skip" never means "leave the requirement unmet." */}
        <p
          className={cn(
            "rounded-md px-3 py-2 text-caption",
            flatTierSatisfied ? "bg-success-bg text-success" : "bg-attention-bg text-attention",
          )}
        >
          {flatTierSatisfied
            ? "Your uploaded photo already satisfies the Flat Scan requirement — this full capture is an optional upgrade."
            : "You'll still need at least a Front photo in Photos & Description before you can publish, scan or no scan."}
        </p>

        <div className="flex gap-2">
          <a
            href={onSkipHref}
            className="flex h-11 flex-1 items-center justify-center rounded-md border border-border text-body font-medium"
          >
            ← Back
          </a>
          <a
            href={onSkipHref}
            className="flex h-11 flex-[2] items-center justify-center rounded-md bg-primary text-body font-medium text-white"
          >
            {done === SCAN_STEPS.length ? "Finish & Continue" : "Continue with Flat Scan"}
          </a>
        </div>
      </aside>
    </div>
  );
}
