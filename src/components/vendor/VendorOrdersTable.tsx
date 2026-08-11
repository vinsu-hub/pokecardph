"use client";

import { useState } from "react";
import { ResponsiveTable, type Column } from "@/components/shared/ResponsiveTable";
import { SlideOver } from "@/components/shared/SlideOver";
import { StatusPill, ORDER_TONE } from "@/components/shared/StatusPill";
import { php } from "@/lib/utils";

/**
 * Vendor Orders. Reference: VENDOR ORDERS behaviour in MASTER_PROMPT §5 (2.5)
 * — a table with a right slide-over on row click. The slide-over is the shared
 * component from Phase 0, so below 1024px it's full-width rather than a
 * squeezed rail.
 */

export type VendorOrder = {
  id: string;
  short: string;
  buyer: string;
  item: string;
  amount: number;
  status: string;
  date: string;
  payment: string | null;
  address: { name?: string; phone?: string; line1?: string; city?: string } | null;
};

const NEXT: Record<string, string | null> = {
  pending: "paid",
  paid: "preparing",
  preparing: "shipped",
  shipped: "completed",
  completed: null,
  cancelled: null,
};

export function VendorOrdersTable({
  orders,
  advance,
}: {
  orders: VendorOrder[];
  advance: (fd: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState<VendorOrder | null>(null);

  const columns: Column<VendorOrder>[] = [
    { key: "id", header: "Order", mobile: "title", cell: (o) => <span className="font-medium text-primary">#{o.short}</span> },
    { key: "status", header: "Status", mobile: "meta", cell: (o) => <StatusPill tone={ORDER_TONE[o.status] ?? "info"}>{o.status}</StatusPill> },
    { key: "buyer", header: "Buyer", cell: (o) => o.buyer },
    { key: "item", header: "Item", cell: (o) => o.item },
    { key: "amount", header: "Amount", cell: (o) => <span className="font-bold tabular">{php(o.amount)}</span> },
    { key: "date", header: "Date", cell: (o) => <span className="text-text-secondary">{o.date}</span> },
  ];

  const next = open ? NEXT[open.status] : null;

  return (
    <>
      <ResponsiveTable
        columns={columns}
        rows={orders}
        rowKey={(o) => o.id}
        onRowClick={(o) => setOpen(o)}
        empty="No orders for your shop yet."
      />

      <SlideOver
        open={open != null}
        onClose={() => setOpen(null)}
        title={open ? `Order #${open.short}` : undefined}
        footer={
          open && next ? (
            <form action={advance} onSubmit={() => setOpen(null)}>
              <input type="hidden" name="orderId" value={open.id} />
              <input type="hidden" name="status" value={next} />
              <button className="h-11 w-full rounded-md bg-primary text-body font-medium text-white active:scale-[0.98]">
                Mark as {next}
              </button>
            </form>
          ) : null
        }
      >
        {open && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <StatusPill tone={ORDER_TONE[open.status] ?? "info"}>{open.status}</StatusPill>
              {open.payment && (
                <span className="text-caption text-text-secondary">{open.payment.toUpperCase()}</span>
              )}
            </div>

            <section>
              <h3 className="text-caption font-medium text-text-secondary">Item</h3>
              <p className="mt-1 text-body">{open.item}</p>
              <p className="text-body font-bold tabular">{php(open.amount)}</p>
            </section>

            <section>
              <h3 className="text-caption font-medium text-text-secondary">Buyer</h3>
              <p className="mt-1 text-body">{open.buyer}</p>
              {open.address?.phone && (
                <p className="text-body text-text-secondary">{open.address.phone}</p>
              )}
            </section>

            {open.address?.line1 && (
              <section>
                <h3 className="text-caption font-medium text-text-secondary">Shipping</h3>
                <p className="mt-1 text-body text-text-secondary">
                  {open.address.line1}
                  {open.address.city ? `, ${open.address.city}` : ""}
                </p>
              </section>
            )}

            <section>
              <h3 className="text-caption font-medium text-text-secondary">Placed</h3>
              <p className="mt-1 text-body text-text-secondary">{open.date}</p>
            </section>
          </div>
        )}
      </SlideOver>
    </>
  );
}
