"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ListingCard } from "@/lib/supabase/types";

/**
 * Cart state.
 *
 * The schema has no cart table — carts are pre-purchase intent, not a record
 * worth persisting server-side, and a signed-out visitor must be able to fill
 * one before the soft-gate prompts them. So it lives in a cookie: readable by
 * server components (unlike localStorage), survives a refresh, and merges
 * naturally when the visitor signs in because the cookie outlives the sign-in.
 */

const COOKIE = "pcph_cart";

export type CartLine = { listingId: string; qty: number };

async function read(): Promise<CartLine[]> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function write(lines: CartLine[]) {
  (await cookies()).set(COOKIE, JSON.stringify(lines), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getCart(): Promise<CartLine[]> {
  return read();
}

export async function getCartCount(): Promise<number> {
  return (await read()).reduce((n, l) => n + l.qty, 0);
}

/** Cart lines resolved against live listing data, with anything sold or
 *  removed dropped rather than silently priced from a stale cookie. */
export async function getCartDetail(): Promise<
  { line: CartLine; listing: ListingCard }[]
> {
  const lines = await read();
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

export async function addToCart(formData: FormData) {
  const listingId = String(formData.get("listingId"));
  const lines = await read();
  const found = lines.find((l) => l.listingId === listingId);
  if (found) found.qty += 1;
  else lines.push({ listingId, qty: 1 });
  await write(lines);
  revalidatePath("/cart");
  revalidatePath(`/card/${listingId}`);
}

export async function setQty(formData: FormData) {
  const listingId = String(formData.get("listingId"));
  const qty = Math.max(0, Number(formData.get("qty") ?? 1));
  let lines = await read();
  lines = qty === 0
    ? lines.filter((l) => l.listingId !== listingId)
    : lines.map((l) => (l.listingId === listingId ? { ...l, qty } : l));
  await write(lines);
  revalidatePath("/cart");
}

export async function removeFromCart(formData: FormData) {
  const listingId = String(formData.get("listingId"));
  await write((await read()).filter((l) => l.listingId !== listingId));
  revalidatePath("/cart");
}

export async function clearCart() {
  await write([]);
}

