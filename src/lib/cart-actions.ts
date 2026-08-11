"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CART_COOKIE, parseCart, type CartLine } from "@/lib/cart";

/** Cart MUTATIONS. Every export here is a Server Action, hence async-only. */

async function read(): Promise<CartLine[]> {
  return parseCart((await cookies()).get(CART_COOKIE)?.value);
}

async function write(lines: CartLine[]) {
  (await cookies()).set(CART_COOKIE, JSON.stringify(lines), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
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
  await write((await read()).filter((l) => l.listingId !== String(formData.get("listingId"))));
  revalidatePath("/cart");
}

export async function clearCart() {
  await write([]);
}
