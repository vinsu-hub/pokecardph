"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { SlideOver } from "@/components/shared/SlideOver";
import { addTradeCard } from "@/app/trade/actions";

/** A catalog row, narrowed to what the "add a card" picker needs. */
type CatalogEntry = { id: string; name: string; set_name: string };

export function TradeHeroActions({ catalog }: { catalog: CatalogEntry[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <button
        onClick={() => setOpen(true)}
        className="flex h-11 items-center gap-1.5 rounded-md bg-primary px-5 text-body font-medium text-white transition-colors duration-(--duration-instant) hover:bg-primary-hover active:scale-[0.98]"
      >
        <Plus className="size-4.5" />
        Add Cards for Trade
      </button>
      <Link
        href="/trade?tab=my-trade-cards#recommended-matches"
        className="flex h-11 items-center gap-1.5 rounded-md border border-border px-5 text-body font-medium text-text-primary transition-colors duration-(--duration-instant) hover:bg-bg-muted"
      >
        <Search className="size-4.5" />
        Browse Trade Matches
      </Link>

      <SlideOver open={open} onClose={() => setOpen(false)} title="Add a card for trade">
        <form
          action={async (formData) => {
            await addTradeCard(formData);
            setOpen(false);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="hero-cardId" className="text-caption font-medium">Card</label>
            <select
              id="hero-cardId"
              name="cardId"
              required
              className="h-11 rounded-md border border-border bg-bg px-3 text-body"
            >
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.set_name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="hero-condition" className="text-caption font-medium">Condition</label>
            <input
              id="hero-condition" name="condition" defaultValue="NM"
              className="h-11 rounded-md border border-border px-3 text-body"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="hero-value" className="text-caption font-medium">Est. value ₱</label>
            <input
              id="hero-value" name="value" type="number" min="0" defaultValue="1500"
              className="h-11 rounded-md border border-border px-3 text-body tabular"
            />
          </div>
          <button className="h-11 rounded-md bg-primary text-body font-medium text-white active:scale-[0.98]">
            Add card
          </button>
        </form>
      </SlideOver>
    </div>
  );
}
