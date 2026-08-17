"use client";

import { createPortal } from "react-dom";
import { useIsClient } from "@/lib/use-is-client";
import { ChromaKeyVideo } from "@/components/shared/ChromaKeyVideo";

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
  anchored = false,
}: {
  state: "idle" | "pending" | "success" | "error";
  /** 0-100, real data only — never invented. Omit to skip the progress bar
   *  entirely (most callers — a Server Action's `pending` boolean has no
   *  real percentage to show). */
  progress?: number;
  pendingLabel?: string;
  successLabel?: string;
  errorMessage?: string;
  /** Gives the overlay a stable `view-transition-name` so it survives
   *  Next's route-navigation transitions as one persistent element instead
   *  of being torn down and rebuilt at each step of the transition chain
   *  Next fires per navigation (confirmed by instrumenting
   *  `document.startViewTransition` directly) — that rebuild is what read
   *  as a white flicker between steps. Only `src/app/loading.tsx` (the one
   *  instance actually living inside a route transition) should set this —
   *  the name must stay unique document-wide, and the browser aborts a
   *  transition outright on a collision, so the three Server-Action
   *  overlays (checkout, trade, beta signup) leave it unset. */
  anchored?: boolean;
}) {
  const mounted = useIsClient();
  if (!mounted || state === "idle") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center px-4"
      role="status"
      aria-live="polite"
      style={anchored ? { viewTransitionName: "loading-overlay" } : undefined}
    >
      <div aria-hidden className="absolute inset-0 backdrop-blur-md bg-text-primary/10" />
      <div className="relative flex w-full max-w-[400px] flex-col items-center gap-4 px-4">
        {state === "error" ? (
          <p className="rounded-md bg-danger-bg px-3 py-2 text-center text-body text-danger">
            {errorMessage}
          </p>
        ) : (
          <>
            <ChromaKeyVideo
              videoKey={state}
              loop={state === "pending"}
              className="h-auto w-full max-w-[368px] aspect-[368/199]"
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
