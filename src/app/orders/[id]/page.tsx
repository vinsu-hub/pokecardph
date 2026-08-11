import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { StatusPill, ORDER_TONE } from "@/components/shared/StatusPill";
import { php } from "@/lib/utils";
import { getCartCount } from "@/lib/cart";
import { OrderCompleteCue } from "@/components/buyer/OrderCompleteCue";

/**
 * Order confirmation & tracking.
 *
 * Progress stepper: Paid → Preparing → Shipped → Completed. `pending` sits
 * before all of them (payment isn't wired), `cancelled` short-circuits.
 */
export const dynamic = "force-dynamic";

const LADDER = [
  { key: "paid", label: "Paid", note: "Payment confirmed" },
  { key: "preparing", label: "Preparing", note: "The vendor is packing your order" },
  { key: "shipped", label: "Shipped", note: "On its way, or meetup scheduled" },
  { key: "completed", label: "Completed", note: "Delivered and confirmed" },
];

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { id } = await params;
  const { placed } = await searchParams;

  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/orders/${id}`);

  const supabase = await createClient();
  const cartCount = await getCartCount();

  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*, listings(*, cards(name, set_name), shops(name)))")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const items = (order.order_items ?? []) as {
    id: string; quantity: number; price_at_purchase: number;
    listings: {
      id: string;
      cards: { name: string; set_name: string } | null;
      shops: { name: string };
    } | null;
  }[];

  const idx = LADDER.findIndex((s) => s.key === order.status);
  const cancelled = order.status === "cancelled";
  const address = order.shipping_address as {
    name?: string; phone?: string; line1?: string; city?: string;
  } | null;

  return (
    <AppShell user={shellUser(user)} cartCount={cartCount}>
      {/* Cue fires once on arrival from checkout, never on a plain revisit. */}
      {placed === "1" && <OrderCompleteCue />}

      {placed === "1" && (
        <div className="mb-4 rounded-lg bg-success-bg px-4 py-3">
          <p className="text-h3 font-semibold text-success">
            Thank you{user.displayName ? `, ${user.displayName}` : ""}!
          </p>
          <p className="text-body text-success">
            Your order is placed. We&apos;ll keep you posted here.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-display font-bold">
          Order #{order.id.slice(0, 8).toUpperCase()}
        </h1>
        <StatusPill tone={ORDER_TONE[order.status] ?? "info"}>{order.status}</StatusPill>
      </div>
      <p className="mt-1 text-body text-text-secondary">
        Placed{" "}
        {new Date(order.created_at).toLocaleString("en-PH", {
          year: "numeric", month: "long", day: "numeric",
          hour: "numeric", minute: "2-digit",
        })}
        {order.payment_method ? ` · ${order.payment_method.toUpperCase()}` : ""}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
            <h2 className="text-h3 font-semibold">Order progress</h2>
            {cancelled ? (
              <p className="mt-3 rounded-md bg-danger-bg px-3 py-2 text-body text-danger">
                This order was cancelled.
              </p>
            ) : (
              <ol className="mt-4 flex flex-col">
                {LADDER.map((step, i) => {
                  const done = i < idx;
                  const active = i === idx;
                  return (
                    <li key={step.key} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={`grid size-7 shrink-0 place-items-center rounded-full border-2 text-caption font-medium ${
                            done
                              ? "border-primary bg-primary text-white"
                              : active
                                ? "border-primary text-primary"
                                : "border-border text-text-muted"
                          }`}
                        >
                          {done ? "✓" : active ? "●" : i + 1}
                        </span>
                        {i < LADDER.length - 1 && (
                          <span className={`w-0.5 flex-1 ${done ? "bg-primary" : "bg-border"}`} />
                        )}
                      </div>
                      <div className="pb-6">
                        <p className={`text-body ${active ? "font-medium text-primary" : done ? "font-medium" : "text-text-muted"}`}>
                          {step.label}
                        </p>
                        {active && (
                          <p className="mt-0.5 text-caption text-text-secondary">{step.note}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
            {order.status === "pending" && (
              <p className="rounded-md bg-attention-bg px-3 py-2 text-caption text-attention">
                Awaiting payment. Payment processing isn&apos;t connected yet — a vendor
                can advance this order from their Orders panel.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
            <h2 className="text-h3 font-semibold">Items</h2>
            <ul className="mt-3 flex flex-col gap-3">
              {items.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0">
                  <div className="min-w-0">
                    {it.listings ? (
                      <Link href={`/card/${it.listings.id}`} className="truncate text-body font-medium hover:text-primary">
                        {it.listings.cards?.name ?? "Auction item"}
                      </Link>
                    ) : (
                      <p className="text-body font-medium">Item</p>
                    )}
                    <p className="truncate text-caption text-text-secondary">
                      {it.listings?.shops?.name} · ×{it.quantity}
                    </p>
                  </div>
                  <span className="text-body font-bold tabular">
                    {php(Number(it.price_at_purchase) * it.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
            <h2 className="text-h3 font-semibold">Summary</h2>
            <dl className="mt-3 flex flex-col gap-2">
              <Row label="Subtotal" value={php(Number(order.subtotal))} />
              <Row label="Shipping" value={php(Number(order.shipping_fee))} />
              <Row label="Platform fee" value={php(Number(order.platform_fee))} />
              <div className="flex items-center justify-between border-t border-border pt-3">
                <dt className="text-body font-medium">Total</dt>
                <dd className="text-h3 font-bold tabular">{php(Number(order.total))}</dd>
              </div>
            </dl>
          </section>

          {address?.line1 && (
            <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
              <h2 className="text-h3 font-semibold">Delivery</h2>
              <p className="mt-2 text-body">{address.name}</p>
              <p className="text-body text-text-secondary">{address.phone}</p>
              <p className="text-body text-text-secondary">
                {address.line1}
                {address.city ? `, ${address.city}` : ""}
              </p>
              {order.tracking_number && (
                <p className="mt-2 text-caption text-text-secondary">
                  Tracking: <span className="tabular">{order.tracking_number}</span>
                  {order.courier ? ` · ${order.courier}` : ""}
                </p>
              )}
            </section>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-body text-text-secondary">{label}</dt>
      <dd className="text-body tabular">{value}</dd>
    </div>
  );
}
