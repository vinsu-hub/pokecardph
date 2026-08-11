"use client";

import { useState } from "react";
import { AppShell } from "@/components/shared/AppShell";
import { FilterSheet } from "@/components/shared/FilterSheet";
import { SlideOver } from "@/components/shared/SlideOver";
import { ResponsiveTable, type Column } from "@/components/shared/ResponsiveTable";
import { StatusPill, ORDER_TONE } from "@/components/shared/StatusPill";
import {
  StickyActionBar,
  StickyActionBarSpacer,
} from "@/components/shared/StickyActionBar";
import { php } from "@/lib/utils";

/**
 * Phase 0 gate page — proves the tokens resolve and the five responsive shell
 * components switch correctly at the 640/1024px lines. Replaced by the real
 * Home/Browse in Phase 1.
 */

type Order = {
  id: string;
  buyer: string;
  item: string;
  amount: number;
  status: keyof typeof ORDER_TONE;
  date: string;
};

const ORDERS: Order[] = [
  { id: "#PC-10482", buyer: "Vince T.", item: "Charizard ex PSA 10", amount: 4500, status: "paid", date: "May 13" },
  { id: "#PC-10481", buyer: "Miguel D.", item: "Gengar VMAX", amount: 2800, status: "preparing", date: "May 13" },
  { id: "#PC-10479", buyer: "Zach R.", item: "Pikachu AR", amount: 1250, status: "shipped", date: "May 12" },
  { id: "#PC-10477", buyer: "Kaye B.", item: "Blastoise ex", amount: 1800, status: "completed", date: "May 12" },
];

const COLUMNS: Column<Order>[] = [
  { key: "id", header: "Order ID", cell: (o) => <span className="font-medium text-primary">{o.id}</span>, mobile: "title" },
  { key: "status", header: "Status", cell: (o) => <StatusPill tone={ORDER_TONE[o.status]}>{o.status}</StatusPill>, mobile: "meta" },
  { key: "buyer", header: "Buyer", cell: (o) => o.buyer },
  { key: "item", header: "Item", cell: (o) => o.item },
  { key: "amount", header: "Amount", cell: (o) => <span className="tabular font-bold">{php(o.amount)}</span> },
  { key: "date", header: "Date", cell: (o) => <span className="text-text-secondary">{o.date}</span> },
];

const TOKENS = [
  ["primary", "bg-primary"],
  ["primary-hover", "bg-primary-hover"],
  ["primary-subtle", "bg-primary-subtle"],
  ["bg-muted", "bg-bg-muted"],
  ["border", "bg-border"],
  ["text-primary", "bg-text-primary"],
  ["text-secondary", "bg-text-secondary"],
  ["text-muted", "bg-text-muted"],
] as const;

export default function Page() {
  const [panel, setPanel] = useState(false);

  return (
    <AppShell cartCount={2}>
      <div className="flex flex-col gap-8">
        <header>
          <h1 className="text-display font-bold">Phase 0 — shell check</h1>
          <p className="mt-1 text-body text-text-secondary">
            Resize across 640px and 1024px. Nav becomes a bottom tab bar, filters
            become a sheet, the table becomes cards, the action bar pins.
          </p>
        </header>

        {/* Tokens */}
        <section>
          <h2 className="text-h2 font-semibold">Color tokens</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {TOKENS.map(([name, cls]) => (
              <div key={name} className="flex flex-col gap-1.5">
                <div className={`h-14 rounded-md border border-border ${cls}`} />
                <span className="text-caption text-text-secondary">{name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Status pills */}
        <section>
          <h2 className="text-h2 font-semibold">Status vocabulary</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusPill tone="success">completed</StatusPill>
            <StatusPill tone="info">preparing</StatusPill>
            <StatusPill tone="attention">pending</StatusPill>
            <StatusPill tone="danger">cancelled</StatusPill>
            <StatusPill tone="paid">paid</StatusPill>
            <StatusPill tone="neutral">shipped</StatusPill>
          </div>
        </section>

        {/* Type scale */}
        <section>
          <h2 className="text-h2 font-semibold">Type scale</h2>
          <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border bg-bg p-(--card-pad)">
            <p className="text-display font-bold">Display 32/700</p>
            <p className="text-h2 font-semibold">H2 24/600</p>
            <p className="text-h3 font-semibold">H3 18/600</p>
            <p className="text-body">Body 14/400</p>
            <p className="text-body font-medium">Body emphasis 14/500</p>
            <p className="text-caption text-text-secondary">Caption 12/400</p>
            <p className="text-body font-bold tabular">{php(128450)} — price 700, tabular</p>
          </div>
        </section>

        {/* Filter + table */}
        <section className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <FilterSheet activeCount={3}>
            <div className="rounded-lg border border-border bg-bg p-(--card-pad)">
              <h3 className="text-h3 font-semibold">Filter By</h3>
              <ul className="mt-3 flex flex-col gap-2 text-body">
                {["Scarlet & Violet", "Sword & Shield", "Sun & Moon", "XY Series"].map((s) => (
                  <li key={s}>
                    {/* Whole row is the tap target, not just the 16px box. */}
                    <label className="flex h-11 cursor-pointer items-center gap-2">
                      <input type="checkbox" className="size-4 accent-[var(--color-primary)]" />
                      <span className="flex-1">{s}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </FilterSheet>

          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-h2 font-semibold">Recent Orders</h2>
              <button
                onClick={() => setPanel(true)}
                className="h-11 rounded-md border border-border bg-bg px-4 text-body font-medium transition-transform duration-(--duration-instant) active:scale-[0.98]"
              >
                Open slide-over
              </button>
            </div>
            <ResponsiveTable
              columns={COLUMNS}
              rows={ORDERS}
              rowKey={(o) => o.id}
              onRowClick={() => setPanel(true)}
            />
          </div>
        </section>

        <StickyActionBar>
          <button className="h-11 w-full rounded-md bg-primary px-4 text-body font-medium text-white transition-all duration-(--duration-instant) hover:bg-primary-hover active:scale-[0.98] lg:w-auto">
            Primary action — pinned on mobile
          </button>
        </StickyActionBar>
        <StickyActionBarSpacer />
      </div>

      <SlideOver
        open={panel}
        onClose={() => setPanel(false)}
        title="Order #PC-10482"
        footer={
          <button className="h-11 w-full rounded-md bg-primary text-body font-medium text-white active:scale-[0.98]">
            Mark as Shipped
          </button>
        }
      >
        <p className="text-body text-text-secondary">
          Full-height on mobile, 480px panel on desktop. Escape closes it, body
          scroll locks while open, and the exit runs faster than the entrance.
        </p>
      </SlideOver>
    </AppShell>
  );
}
