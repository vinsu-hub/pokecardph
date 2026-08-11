import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { StatusPill, ORDER_TONE } from "@/components/shared/StatusPill";
import { php } from "@/lib/utils";
import { getCartCount } from "@/lib/cart";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/orders");

  const supabase = await createClient();
  const cartCount = await getCartCount();

  const { data: orders } = await supabase
    .from("orders")
    .select("*, order_items(quantity, price_at_purchase, listings(cards(name)))")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <AppShell user={shellUser(user)} cartCount={cartCount}>
      <h1 className="text-display font-bold">My Orders</h1>

      {(orders?.length ?? 0) === 0 ? (
        <div className="mt-6 rounded-lg border border-border bg-bg px-6 py-12 text-center">
          <p className="text-body text-text-secondary">No orders yet.</p>
          <Link href="/" className="mt-4 inline-flex h-11 items-center rounded-md bg-primary px-4 text-body font-medium text-white">
            Start browsing
          </Link>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {orders!.map((o) => {
            const items = (o.order_items ?? []) as {
              quantity: number;
              listings: { cards: { name: string } | null } | null;
            }[];
            const first = items[0]?.listings?.cards?.name ?? "Auction win";
            const more = items.length - 1;
            return (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg p-4 transition-colors duration-(--duration-instant) hover:bg-bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium">
                      {first}
                      {more > 0 && (
                        <span className="text-text-secondary"> +{more} more</span>
                      )}
                    </p>
                    <p className="text-caption text-text-secondary">
                      #{o.id.slice(0, 8).toUpperCase()} ·{" "}
                      {new Date(o.created_at).toLocaleDateString("en-PH", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-body font-bold tabular">{php(Number(o.total))}</span>
                    <StatusPill tone={ORDER_TONE[o.status] ?? "info"}>{o.status}</StatusPill>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
