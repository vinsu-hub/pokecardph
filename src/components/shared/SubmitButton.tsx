"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * A submit button that disables itself while its form is in flight.
 *
 * Not cosmetic. A Server Action that mutates and then redirects can be fired
 * twice by an impatient double-click; the second call finds the work already
 * done and takes a different branch, so the wrong redirect wins and the user
 * lands somewhere confusing. Checkout hit exactly this — the order was created
 * correctly, then the duplicate submission bounced the browser to /cart.
 *
 * The auth spec calls for the same behaviour on its own sign-in button:
 * non-interactive immediately on click, before any transition completes.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
  name,
  value,
  onClick,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  name?: string;
  value?: string;
  onClick?: () => void;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      onClick={onClick}
      disabled={pending}
      aria-busy={pending}
      className={cn(
        "transition-all duration-(--duration-instant) active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
        className,
      )}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
