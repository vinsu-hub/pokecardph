import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Philippine peso, no decimals — prices in this market are whole pesos. */
export function php(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}
