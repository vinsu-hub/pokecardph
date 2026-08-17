"use client";

import { createPortal } from "react-dom";
import { useIsClient } from "@/lib/use-is-client";

/**
 * On-brand replacement for a generic spinner during a real async action —
 * a Pikachu pixel-art loop (rendered via Remotion, see D:\CODING\remotion)
 * instead of plain "Sending…" text, floating over a blurred backdrop with no
 * card/box chrome of its own. Three states:
 *
 * - "pending": the looping chase/cart-fill clip, plus a real progress bar
 *   only when the caller has real percentage data (uploads/multi-step
 *   flows) — no decorative indeterminate animation when it doesn't, since
 *   Pikachu's own loop already reads as "in progress" on its own.
 * - "success": the one-shot finish-line clip, then the caller dismisses.
 * - "error": the app's existing danger-styled message pattern — the success
 *   clip never plays on failure, per spec.
 *
 * Not shown at all when `state` is "idle".
 */
export function LoadingIndicator({
  state,
  progress,
  pendingLabel = "Loading…",
  successLabel = "Done!",
  errorMessage = "Something went wrong — please try again.",
}: {
  state: "idle" | "pending" | "success" | "error";
  /** 0-100, real data only — never invented. Omit to skip the progress bar
   *  entirely (most callers — a Server Action's `pending` boolean has no
   *  real percentage to show). */
  progress?: number;
  pendingLabel?: string;
  successLabel?: string;
  errorMessage?: string;
}) {
  const mounted = useIsClient();
  if (!mounted || state === "idle") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 isolate grid place-items-center px-4"
      role="status"
      aria-live="polite"
    >
      <div aria-hidden className="absolute inset-0 backdrop-blur-md bg-text-primary/10" />
      <div className="relative flex w-full max-w-[400px] flex-col items-center gap-4 px-4">
        {state === "error" ? (
          <p className="rounded-md bg-danger-bg px-3 py-2 text-center text-body text-danger">
            {errorMessage}
          </p>
        ) : (
          <>
            {/* `key` forces a remount on state change so "success" always
                restarts its clip from frame 0 instead of freezing on
                whatever frame "pending" last painted.

                mix-blend-multiply: the source sprite sheet bakes each frame
                onto a near-white (#F8FAFC) card background rather than true
                alpha transparency (real per-frame background removal was
                never done — see D:\CODING\remotion\src\pikachu\
                spritesheet.tsx's own comment). Multiplying that near-white
                background against whatever's behind it (the blurred page)
                leaves it effectively unchanged/invisible, while Pikachu's
                actual yellow/black/red artwork stays visible — same
                background-removal-by-blend-mode technique globals.css
                already uses for the shelf shine-sweep (mix-blend-mode:
                screen, the inverse operation). `isolate` on the parent
                scopes the blend to this overlay only. */}
            <video
              key={state}
              autoPlay
              loop={state === "pending"}
              muted
              playsInline
              className="mix-blend-multiply h-auto w-full max-w-[368px] aspect-[368/199]"
              src={state === "pending" ? "/loading/pikachu-pending.webm" : "/loading/pikachu-complete.webm"}
            />

            {state === "pending" && progress != null && (
              <div className="h-3 w-full overflow-hidden rounded-full bg-bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-(--duration-base)"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              </div>
            )}

            <p className="text-body font-medium text-text-primary drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
              {state === "pending" ? pendingLabel : successLabel}
            </p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
