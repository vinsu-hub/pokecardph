import { redirect } from "next/navigation";
import { getSessionUser, shellUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shared/AppShell";
import { CheckoutForm } from "@/components/buyer/CheckoutForm";
import { conditionLabel } from "@/lib/supabase/types";
import { getCartDetail } from "@/lib/cart";
import { clearCart } from "@/lib/cart-actions";
import { platformFee } from "@/lib/utils";

/**
 * Checkout.
 *
 * PAYMENT IS A PLACEHOLDER. Xendit isn't provisioned (XENDIT_SECRET_KEY is
 * empty), so the payment step records the chosen method and nothing more. The
 * order itself is created for real with status 'pending'. The UI says this
 * plainly rather than implying a charge happened.
 */
export const dynamic = "force-dynamic";

const SHIPPING = 120;

async function placeOrder(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/checkout");

  const detail = await getCartDetail();
  if (!detail.length) redirect("/cart");

  const subtotal = detail.reduce((s, d) => s + Number(d.listing.price) * d.line.qty, 0);
  const fee = platformFee(subtotal);

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      buyer_id: user.id,
      subtotal,
      shipping_fee: SHIPPING,
      platform_fee: fee,
      total: subtotal + fee + SHIPPING,
      payment_method: String(formData.get("payment") ?? "gcash"),
      status: "pending",
      shipping_address: {
        name: String(formData.get("name") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        line1: String(formData.get("address") ?? ""),
        city: String(formData.get("city") ?? ""),
      },
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: itemsErr } = await supabase.from("order_items").insert(
    detail.map((d) => ({
      order_id: order.id,
      listing_id: d.listing.id,
      shop_id: d.listing.shop_id,
      quantity: d.line.qty,
      price_at_purchase: Number(d.listing.price),
    })),
  );
  if (itemsErr) throw new Error(itemsErr.message);

  await clearCart();
  redirect(`/orders/${order.id}?placed=1`);
}

export default async function CheckoutPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/checkout");

  const detail = await getCartDetail();
  if (!detail.length) redirect("/cart");

  const subtotal = detail.reduce((s, d) => s + Number(d.listing.price) * d.line.qty, 0);
  const fee = platformFee(subtotal);

  return (
    <AppShell user={shellUser(user)} cartCount={detail.length}>
      <h1 className="text-display font-bold">Checkout</h1>
      <CheckoutForm
        action={placeOrder}
        defaultName={user.displayName ?? ""}
        items={detail.map((d) => ({
          id: d.listing.id,
          name: d.listing.cards.name,
          meta: `${conditionLabel(d.listing)} · ${d.listing.shops.name}`,
          qty: d.line.qty,
          lineTotal: Number(d.listing.price) * d.line.qty,
        }))}
        totals={{
          subtotal,
          shipping: SHIPPING,
          fee,
          total: subtotal + fee + SHIPPING,
        }}
      />
    </AppShell>
  );
}
