import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { ListingCard } from "@/lib/supabase/types";

/**
 * Cart READS. Deliberately separate from cart-actions.ts.
 *
 * A "use server" module is a Server Actions boundary — every export becomes a
 * callable action. Reading cookies during render belongs in a plain
 * server-only module, not behind that boundary.
 *
 * The cart lives in a cookie rather than a table: it's pre-purchase intent,
 * not a record worth persisting, and a signed-out visitor must be able to fill
 * one before the soft-gate prompts them.
 */

export const CART_COOKIE = "pcph_cart";

export type CartLine = { listingId: string; qty: number };

function safeDecode(v: string) {
  try { return decodeURIComponent(v); } catch { return v; }
}

export function parseCart(raw: string | undefined): CartLine[] {
  if (!raw) return [];
  for (const candidate of [raw, safeDecode(raw)]) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* try next */ }
  }
  return [];
}

export async function getCart(): Promise<CartLine[]> {
  return parseCart((await cookies()).get(CART_COOKIE)?.value);
}

export async function getCartCount(): Promise<number> {
  return (await getCart()).reduce((n, l) => n + l.qty, 0);
}

/** Cart lines resolved against live listing data. Anything sold or removed is
 *  dropped rather than priced from a stale cookie. */
export async function getCartDetail(): Promise<{ line: CartLine; listing: ListingCard }[]> {
  const lines = await getCart();
  if (!lines.length) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("*, cards(*), shops(*)")
    .in("id", lines.map((l) => l.listingId))
    .eq("status", "active");

  const byId = new Map((data ?? []).map((l) => [l.id, l as unknown as ListingCard]));
  return lines
    .filter((l) => byId.has(l.listingId))
    .map((l) => ({ line: l, listing: byId.get(l.listingId)! }));
}
