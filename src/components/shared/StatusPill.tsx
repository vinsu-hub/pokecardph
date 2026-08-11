import { cn } from "@/lib/utils";

/**
 * The single status vocabulary for the whole product — orders, trades,
 * auctions, billing. Shape is locked by the design system: fully rounded,
 * 12px medium, px-2.5 py-0.5. Buyers learn this pattern once; it never varies.
 */
export type StatusTone =
  | "success" // Completed order, paid invoice
  | "info" // Preparing, live auction
  | "attention" // Pending, needs attention, trial ending
  | "danger" // Cancelled, restricted, overdue
  | "paid" // Paid status, Premium Shop badge
  | "neutral"; // Shipped, meetup scheduled

const TONE: Record<StatusTone, string> = {
  success: "bg-success-bg text-success",
  info: "bg-info-bg text-info",
  attention: "bg-attention-bg text-attention",
  danger: "bg-danger-bg text-danger",
  paid: "bg-paid-bg text-paid",
  neutral: "bg-neutral-bg text-neutral",
};

/** Order statuses map to tones in exactly one place. */
export const ORDER_TONE: Record<string, StatusTone> = {
  pending: "attention",
  paid: "paid",
  preparing: "info",
  shipped: "neutral",
  completed: "success",
  cancelled: "danger",
};

export function StatusPill({
  children,
  tone = "info",
  className,
}: {
  children: React.ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-medium capitalize",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
