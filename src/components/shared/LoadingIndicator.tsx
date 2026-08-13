"use client";

import { createPortal } from "react-dom";
import { useIsClient } from "@/lib/use-is-client";
import { cn } from "@/lib/utils";

/**
 * On-brand replacement for a generic spinner during a real async action —
 * a Pikachu pixel-art loop (rendered via Remotion, see D:\CODING\remotion)
 * instead of plain "Sending…" text. Three states:
 *
 * - "pending": the looping chase/cart-fill clip, plus a real progress bar
 *   if the caller has one (uploads/multi-step flows) — falls back to an
 *   indeterminate sweep when it doesn't (most Server Action submits, which
 *   only expose a pending boolean, not a percentage).
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
  /** 0-100, real data only — never invented. Omit for an indeterminate bar. */
  progress?: number;
  pendingLabel?: string;
  successLabel?: string;
  errorMessage?: string;
}) {
  const mounted = useIsClient();
  if (!mounted || state === "idle") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center px-4"
      role="status"
      aria-live="polite"
    >
      <div aria-hidden className="absolute inset-0 bg-text-primary/40" />
      <div
        className="relative flex w-full max-w-[320px] flex-col items-center gap-4 rounded-lg p-6 shadow-elevated"
        style={{ backgroundColor: "#F8FAFC" }}
      >
        {state === "error" ? (
          <p className="rounded-md bg-danger-bg px-3 py-2 text-center text-body text-danger">
            {errorMessage}
          </p>
        ) : (
          <>
            {/* `key` forces a remount on state change so "success" always
                restarts its clip from frame 0 instead of freezing on
                whatever frame "pending" last painted. */}
            <video
              key={state}
              autoPlay
              loop={state === "pending"}
              muted
              playsInline
              className="h-[199px] w-[368px] max-w-full rounded-md border border-border"
              src={state === "pending" ? "/loading/pikachu-pending.webm" : "/loading/pikachu-complete.webm"}
            />

            {state === "pending" && (
              <div className="h-3 w-full overflow-hidden rounded-full border border-border bg-bg">
                {progress != null ? (
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-(--duration-base)"
                    style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                  />
                ) : (
                  <div
                    className={cn(
                      "h-full w-1/3 rounded-full bg-primary",
                      "motion-safe:[animation:loading-indeterminate_1.1s_ease-in-out_infinite]",
                    )}
                  />
                )}
              </div>
            )}

            <p className="text-body font-medium text-text-primary">
              {state === "pending" ? pendingLabel : successLabel}
            </p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
