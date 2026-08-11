import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { VendorShell } from "@/components/vendor/VendorShell";
import { StatusPill, ORDER_TONE } from "@/components/shared/StatusPill";
import { SalesChart } from "@/components/vendor/SalesChart";
import { php } from "@/lib/utils";

/**
 * Vendor Dashboard.
 * Reference: REFERENCE IMAGES/VENDOR DASHBOARD VIEW.png — the canonical
 * version, with Quick Actions, Recent Orders, Sales Overview, Recent Trade
 * Requests, Top Selling Listings and Shop Health.
 *
 * Every figure here is a real query. Nothing is mock data.
 */
export const dynamic = "force-dynamic";

type Row = {
  quantity: number;
  price_at_purchase: number;
  listings: { cards: { name: string } | null } | null;
  orders: { id: string; status: string; created_at: string; buyer_id: string } | null;
};

export default async function VendorDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vendor/dashboard");
  if (!user.shopId) redirect("/vendor/onboarding");

  const supabase = await createClient();
  const shopId = user.shopId;

  const [{ data: items }, { data: listings }, { data: trades }, { data: shop }] =
    await Promise.all([
      supabase
        .from("order_items")
        .select("quantity, price_at_purchase, listings(cards(name)), orders(status, created_at, buyer_id, id)")
        .eq("shop_id", shopId),
      supabase.from("listings").select("id, status, created_at").eq("shop_id", shopId),
      supabase.from("trades").select("id, status, created_at").eq("shop_id", shopId),
      supabase.from("shops").select("*").eq("id", shopId).maybeSingle(),
    ]);

  const rows = (items ?? []) as unknown as Row[];

  const m = computeMetrics(rows, listings ?? [], trades ?? []);
  const {
    totalSales, change, activeListings, newThisWeek, pendingOrders,
    openTrades, recent, top, series, last30Total,
  } = m;

  // Shop Health: a simple composite of "has listings" and "rated well".
  // Deliberately transparent rather than an opaque score — a vendor should be
  // able to tell what would move it.
  const health = Math.min(
    100,
    60 + (activeListings > 0 ? 20 : 0) + (Number(shop?.rating ?? 0) >= 4.5 ? 20 : 0),
  );

  const greeting = greetingFor(new Date().getHours());

  return (
    <VendorShell shopName={user.shopName ?? "Your shop"} tier={shop?.tier}>
      <header>
        <h1 className="text-display font-bold">
          {greeting}, {user.shopName}! 👋
        </h1>
        <p className="mt-1 text-body text-text-secondary">
          Here&apos;s what&apos;s happening with your shop today.
        </p>
      </header>

      {/* Stats */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total Sales" value={php(totalSales)}
          note={change == null ? "no prior period" : `${change >= 0 ? "↑" : "↓"} ${Math.abs(change)}% vs last 30 days`}
          tone={change != null && change >= 0 ? "success" : undefined} />
        <Stat label="Active Listings" value={String(activeListings)}
          note={`${newThisWeek} new this week`} tone="success" />
        <Stat label="Pending Orders" value={String(pendingOrders)}
          note={pendingOrders > 0 ? "Needs attention" : "All clear"}
          tone={pendingOrders > 0 ? "attention" : undefined} />
        <Stat label="Trade Requests" value={String(openTrades)}
          note={openTrades > 0 ? "awaiting your reply" : "none open"}
          tone={openTrades > 0 ? "attention" : undefined} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          {/* Quick actions */}
          <section>
            <h2 className="text-h2 font-semibold">Quick Actions</h2>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { href: "/vendor/listings/add", label: "Add Listing" },
                { href: "/vendor/auctions/create", label: "Create Auction" },
                { href: "/vendor/orders", label: "View Orders" },
                { href: "/vendor/trade-requests", label: "Trade Requests" },
                { href: "/vendor/listings", label: "All Listings" },
                { href: "#", label: "Scan Card", disabled: true, note: "Scan & grade arrives in a later release" },
              ].map((a) => (
                <li key={a.label}>
                  {a.disabled ? (
                    <span title={a.note} className="flex h-20 cursor-not-allowed items-center justify-center rounded-lg border border-border bg-bg text-center text-body font-medium text-text-muted opacity-50">
                      {a.label}
                    </span>
                  ) : (
                    <Link href={a.href} className="flex h-20 items-center justify-center rounded-lg border border-border bg-bg text-center text-body font-medium transition-[transform,box-shadow] duration-(--duration-fast) hover:-translate-y-0.5 hover:shadow-elevated">
                      {a.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* Recent orders */}
          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-h2 font-semibold">Recent Orders</h2>
              <Link href="/vendor/orders" className="text-body text-primary">View all →</Link>
            </div>
            {recent.length === 0 ? (
              <p className="mt-3 rounded-lg border border-border bg-bg px-6 py-8 text-center text-body text-text-secondary">
                No orders yet.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {recent.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg p-3">
                    <div className="min-w-0">
                      <p className="truncate text-body font-medium">{o.item}</p>
                      <p className="text-caption text-text-secondary">
                        #{o.id.slice(0, 8).toUpperCase()} ·{" "}
                        {new Date(o.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-body font-bold tabular">{php(o.amount)}</span>
                      <StatusPill tone={ORDER_TONE[o.status] ?? "info"}>{o.status}</StatusPill>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Sales overview */}
          <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-h2 font-semibold">Sales Overview</h2>
              <div>
                <p className="text-h2 font-bold tabular">{php(last30Total)}</p>
                <p className="text-caption text-text-secondary">last 30 days</p>
              </div>
            </div>
            <SalesChart data={series} />
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
            <h2 className="text-h3 font-semibold">Shop Health</h2>
            <p className="mt-2 text-display font-bold text-success tabular">{health}%</p>
            <p className="text-body font-medium text-success">
              {health >= 90 ? "Excellent" : health >= 70 ? "Good" : "Needs work"}
            </p>
            <p className="mt-1 text-caption text-text-secondary">
              {activeListings === 0
                ? "Publish a listing to raise your score."
                : "Keep it up! Your shop is performing well."}
            </p>
          </section>

          <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
            <h2 className="text-h3 font-semibold">Top Selling Listings</h2>
            {top.length === 0 ? (
              <p className="mt-2 text-body text-text-secondary">No sales yet.</p>
            ) : (
              <ol className="mt-3 flex flex-col gap-2">
                {top.map(([name, n], i) => (
                  <li key={name} className="flex items-center gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-subtle text-caption font-medium text-primary tabular">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-body">{name}</span>
                    <span className="text-caption text-text-secondary tabular">{n} sold</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </VendorShell>
  );
}


type ListingRow = { id: string; status: string; created_at: string };
type TradeRow = { id: string; status: string; created_at: string };

/**
 * All the dashboard arithmetic, outside the component.
 *
 * Not just tidiness: React's purity rule rightly refuses `Date.now()` inside a
 * render body, and every figure here is relative to "now".
 */
function computeMetrics(rows: Row[], listings: ListingRow[], trades: TradeRow[]) {
  const now = Date.now();
  const dayMs = 86_400_000;
  const paid = rows.filter(
    (r) => r.orders && r.orders.status !== "cancelled" && r.orders.status !== "pending",
  );
  const sum = (rs: Row[]) =>
    rs.reduce((s, r) => s + Number(r.price_at_purchase) * r.quantity, 0);

  const inWindow = (iso: string, from: number, to: number) => {
    const t = new Date(iso).getTime();
    return t >= now - from * dayMs && t < now - to * dayMs;
  };
  const last30 = paid.filter((r) => r.orders && inWindow(r.orders.created_at, 30, 0));
  const prev30 = paid.filter((r) => r.orders && inWindow(r.orders.created_at, 60, 30));
  const change =
    sum(prev30) === 0 ? null : Math.round(((sum(last30) - sum(prev30)) / sum(prev30)) * 100);

  const byOrder = new Map<string, { id: string; status: string; created_at: string; item: string; amount: number }>();
  for (const r of rows) {
    if (!r.orders) continue;
    const amount = Number(r.price_at_purchase) * r.quantity;
    const prev = byOrder.get(r.orders.id);
    if (prev) prev.amount += amount;
    else
      byOrder.set(r.orders.id, {
        id: r.orders.id,
        status: r.orders.status,
        created_at: r.orders.created_at,
        item: r.listings?.cards?.name ?? "Auction item",
        amount,
      });
  }

  const units = new Map<string, number>();
  for (const r of paid) {
    const n = r.listings?.cards?.name ?? "Auction item";
    units.set(n, (units.get(n) ?? 0) + r.quantity);
  }

  return {
    totalSales: sum(paid),
    last30Total: sum(last30),
    change,
    activeListings: listings.filter((l) => l.status === "active").length,
    newThisWeek: listings.filter((l) => new Date(l.created_at).getTime() > now - 7 * dayMs).length,
    pendingOrders: new Set(
      rows
        .filter((r) => r.orders && ["pending", "paid", "preparing"].includes(r.orders.status))
        .map((r) => r.orders!.id),
    ).size,
    openTrades: trades.filter((t) => t.status === "proposed").length,
    recent: [...byOrder.values()]
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, 5),
    top: [...units.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
    series: Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now - (29 - i) * dayMs);
      const key = d.toISOString().slice(0, 10);
      return {
        date: d.toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
        total: paid
          .filter((r) => r.orders?.created_at.slice(0, 10) === key)
          .reduce((s, r) => s + Number(r.price_at_purchase) * r.quantity, 0),
      };
    }),
  };
}

function greetingFor(hour: number) {
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function Stat({
  label, value, note, tone,
}: {
  label: string; value: string; note: string;
  tone?: "success" | "attention";
}) {
  return (
    <div className="rounded-lg border border-border bg-bg p-(--card-pad)">
      <p className="text-caption text-text-secondary">{label}</p>
      <p className="mt-1 text-display font-bold tabular">{value}</p>
      <p className={`mt-1 text-caption ${
        tone === "success" ? "text-success" : tone === "attention" ? "text-attention" : "text-text-secondary"
      }`}>
        {note}
      </p>
    </div>
  );
}
