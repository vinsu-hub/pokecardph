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

/**
 * Free shipping threshold — the mockup's own number
 * (REFERENCE IMAGES/BUYER CART.png), not a sourced business rule. Lives here,
 * not duplicated as a local constant in Cart and Checkout separately: a cart
 * that promises free shipping over ₱10,000 and a checkout that still charges
 * ₱120 anyway would be a bar that lies at the one moment it matters most.
 */
export const FREE_SHIPPING_THRESHOLD = 10000;
const BASE_SHIPPING = 120;

export function shippingFee(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : BASE_SHIPPING;
}
