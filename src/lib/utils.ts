import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Philippine peso, no decimals — prices in this market are whole pesos. */
export function php(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

/**
 * Platform fee, flat 2%. Lives here rather than in cart.ts because that file
 * is "use server" — every export there must be async, and a pure arithmetic
 * helper has no business being a Server Action.
 */
export function platformFee(subtotal: number) {
  return Math.round(subtotal * 0.02);
}
