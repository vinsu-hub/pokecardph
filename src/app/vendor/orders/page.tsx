import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { VendorShell } from "@/components/vendor/VendorShell";
import { VendorOrdersTable, type VendorOrder } from "@/components/vendor/VendorOrdersTable";

export const dynamic = "force-dynamic";

const STATUSES = ["all", "pending", "paid", "preparing", "shipped", "completed", "cancelled"];

/**
 * Advance an order's status.
 *
 * The RLS policy lets a vendor UPDATE an order containing their items but
 * cannot restrict WHICH columns — so this action writes `status` and nothing
 * else. Buyer and total are never touched, which is the policy's stated intent
 * enforced at the only layer that can express it.
 */
async function advanceOrder(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user?.shopId) redirect("/vendor/onboarding");

  const orderId = String(formData.get("orderId"));
  const status = String(formData.get("status"));
  if (!["paid", "preparing", "shipped", "completed", "cancelled"].includes(status)) {
    throw new Error("Invalid status");
  }

  const supabase = await createClient();
  const { data: owns } = await supabase
    .from("order_items")
    .select("id")
    .eq("order_id", orderId)
    .eq("shop_id", user.shopId)
    .limit(1);
  if (!owns?.length) throw new Error("Not your order");

  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath("/vendor/orders");
  revalidatePath("/vendor/dashboard");
}

export default async function VendorOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const filter = STATUSES.includes(sp.status ?? "") ? sp.status! : "all";

  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vendor/orders");
  if (!user.shopId) redirect("/vendor/onboarding");

  const supabase = await createClient();
  const { data } = await supabase
    .from("order_items")
    .select("*, listings(cards(name)), orders(*, profiles(display_name))")
    .eq("shop_id", user.shopId);

  type Row = {
    quantity: number;
    price_at_purchase: number;
    listings: { cards: { name: string } | null } | null;
    orders: {
      id: string; status: string; created_at: string; payment_method: string | null;
      shipping_address: VendorOrder["address"];
      profiles: { display_name: string | null } | null;
    } | null;
  };

  const byOrder = new Map<string, VendorOrder>();
  for (const r of (data ?? []) as unknown as Row[]) {
    if (!r.orders) continue;
    const amount = Number(r.price_at_purchase) * r.quantity;
    const existing = byOrder.get(r.orders.id);
    if (existing) {
      existing.amount += amount;
      continue;
    }
    byOrder.set(r.orders.id, {
      id: r.orders.id,
      short: r.orders.id.slice(0, 8).toUpperCase(),
      buyer: r.orders.profiles?.display_name ?? "Collector",
      item: r.listings?.cards?.name ?? "Auction item",
      amount,
      status: r.orders.status,
      payment: r.orders.payment_method,
      address: r.orders.shipping_address,
      date: new Date(r.orders.created_at).toLocaleString("en-PH", {
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      }),
    });
  }

  const all = [...byOrder.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  const orders = filter === "all" ? all : all.filter((o) => o.status === filter);

  return (
    <VendorShell shopName={user.shopName ?? "Your shop"}>
      <h1 className="text-display font-bold">Orders</h1>

      <div className="mt-4 flex flex-wrap gap-1">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/vendor/orders?status=${s}`}
            className={`flex h-11 items-center gap-2 rounded-md px-4 text-body font-medium capitalize ${
              filter === s
                ? "bg-primary-subtle text-primary-on-subtle"
                : "border border-border bg-bg text-text-secondary hover:bg-bg-muted"
            }`}
          >
            {s}
            <span className="text-caption tabular opacity-70">
              {s === "all" ? all.length : all.filter((o) => o.status === s).length}
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-4 text-caption text-text-secondary">
        Click a row to open the order panel and advance its status.
      </p>

      <div className="mt-3">
        <VendorOrdersTable orders={orders} advance={advanceOrder} />
      </div>
    </VendorShell>
  );
}
