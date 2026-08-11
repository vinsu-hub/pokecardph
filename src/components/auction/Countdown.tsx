"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useIsClient } from "@/lib/use-is-client";

/**
 * Live countdown. Tabular numerals so digits don't shift the layout as they
 * tick, and the text transitions to --color-attention under 5 minutes —
 * urgency without alarm, per the motion spec.
 */
export function Countdown({
  endsAt,
  className,
}: {
  endsAt: string;
  className?: string;
}) {
  // A time-dependent value can never match between server render and
  // hydration — the clock has moved. So it's derived during render and gated
  // on hydration, with the interval only forcing a re-render. Storing the
  // remaining time in state instead would mean syncing state to the clock
  // inside an effect, which React 19 rightly flags as a cascading render.
  const isClient = useIsClient();
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const left = isClient ? diff(endsAt) : null;

  const urgent = left != null && left > 0 && left < 5 * 60_000;

  return (
    <span
      className={cn(
        "tabular transition-colors duration-(--duration-base)",
        urgent && "text-attention",
        className,
      )}
    >
      {left == null ? "—" : left <= 0 ? "Ended" : format(left)}
    </span>
  );
}

function diff(iso: string) {
  return new Date(iso).getTime() - Date.now();
}

function format(ms: number) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${String(sec).padStart(2, "0")}s`;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}
