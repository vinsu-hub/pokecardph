import { cn } from "@/lib/utils";

/**
 * The 7-rung trade ladder, shown as a vertical stepper on the detail page.
 *
 * Completed = filled primary circle + check. Active = outlined circle with a
 * dot. Future = border outline + gray number. Locked by the design system's
 * stepper rules; this is the one place that mapping lives.
 */
export const LADDER = [
  { key: "proposed", label: "Trade Proposed" },
  { key: "accepted", label: "Vendor Accepted" },
  { key: "plan_created", label: "Trade Plan Created" },
  { key: "meetup_scheduled", label: "Meetup Scheduled" },
  { key: "cards_verified", label: "Cards Verified" },
  { key: "value_confirmed", label: "Value Confirmed" },
  { key: "completed", label: "Trade Completed" },
] as const;

export function TradeProgress({
  status,
  timestamps,
}: {
  status: string;
  timestamps?: Record<string, string>;
}) {
  const idx = LADDER.findIndex((s) => s.key === status);
  const dead = status === "cancelled" || status === "declined";

  return (
    <ol className="flex flex-col">
      {LADDER.map((step, i) => {
        const done = !dead && i < idx;
        const active = !dead && i === idx;
        return (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full border-2 text-caption font-medium transition-colors duration-(--duration-base)",
                  done && "border-primary bg-primary text-white",
                  active && "border-primary text-primary",
                  !done && !active && "border-border text-text-muted",
                )}
              >
                {done ? "✓" : active ? "●" : i + 1}
              </span>
              {i < LADDER.length - 1 && (
                <span
                  className={cn(
                    "w-0.5 flex-1 transition-colors duration-(--duration-slow)",
                    done ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </div>
            <div className={cn("pb-6", i === LADDER.length - 1 && "pb-0")}>
              <p
                className={cn(
                  "text-body",
                  active ? "font-medium text-primary" : done ? "font-medium" : "text-text-muted",
                )}
              >
                {step.label}
              </p>
              {timestamps?.[step.key] && (
                <p className="mt-0.5 text-caption text-text-secondary tabular">
                  {timestamps[step.key]}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
