"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Scale, X } from "lucide-react";
import { SlideOver } from "@/components/shared/SlideOver";
import { CardArt } from "@/components/buyer/CardArt";
import { proposeTrade } from "@/app/trade/actions";
import { php } from "@/lib/utils";
import { conditionLabel, tradeCardConditionLabel, type ListingCard, type TradeCardWithCard } from "@/lib/supabase/types";

/**
 * "Build Your Trade" — two-column offer/request builder. Selection state
 * lives entirely in the /trade URL's `offer`/`want` query params (not local
 * React state): it's the only approach that survives a tab switch (tabs are
 * real navigations, since this codebase's nav is Link-driven throughout) and
 * preserves Card Detail's existing `?want=<listingId>&shop=<shopId>` deep
 * link into this same param. The two pickers below are plain GET forms —
 * the browser serializes checked boxes into the query string on submit, no
 * client router call needed.
 */

function buildUrl(offerIds: string[], wantIds: string[]) {
  const qs = new URLSearchParams();
  qs.set("tab", "my-trade-cards");
  for (const id of offerIds) qs.append("offer", id);
  for (const id of wantIds) qs.append("want", id);
  return `/trade?${qs.toString()}`;
}

export function TradeBuilder({
  offered,
  wanted,
  offerIds,
  wantIds,
  availableTradeCards,
  listingPool,
}: {
  offered: TradeCardWithCard[];
  wanted: ListingCard[];
  offerIds: string[];
  wantIds: string[];
  availableTradeCards: TradeCardWithCard[];
  listingPool: ListingCard[];
}) {
  const [offerPickerOpen, setOfferPickerOpen] = useState(false);
  const [wantPickerOpen, setWantPickerOpen] = useState(false);

  const offeredValue = offered.reduce((s, c) => s + Number(c.estimated_value ?? 0), 0);
  const requestedValue = wanted.reduce((s, l) => s + Number(l.price), 0);
  const diff = requestedValue - offeredValue;
  const canPropose = offered.length > 0 && wanted.length > 0;

  return (
    <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-h2 font-semibold">Build Your Trade</h2>
        <Link href="/trade?tab=my-trade-cards" className="flex items-center gap-1 text-body font-medium text-primary hover:underline">
          <RefreshCw className="size-3.5" />
          Clear All
        </Link>
      </div>
      <p className="mt-1 text-body text-text-secondary">
        Add cards you want to offer and the cards you want to receive.
      </p>

      <div className="relative mt-4 grid gap-4 lg:grid-cols-2">
        {/* ---- You Offer ---- */}
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-h3 font-semibold text-primary">
              You Offer
              <span className="rounded-full bg-primary-subtle px-2 py-0.5 text-caption font-medium tabular">
                {offered.length}
              </span>
            </h3>
            <button
              onClick={() => setOfferPickerOpen(true)}
              className="flex h-9 items-center gap-1 rounded-md border border-border px-3 text-caption font-medium hover:bg-bg-muted"
            >
              <Plus className="size-3.5" /> Add Card
            </button>
          </div>
          <p className="mt-1 text-caption text-text-secondary">These are the cards you&apos;re offering.</p>

          <ul className="mt-2 flex flex-col divide-y divide-border">
            {offered.map((c) => (
              <li key={c.id} className="flex items-center gap-2 py-2">
                <div className="relative size-11 shrink-0 overflow-hidden rounded-md bg-bg-muted">
                  <CardArt name={c.cards.name} src={c.cards.image_url} sizes="44px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium">{c.cards.name}</p>
                  <p className="truncate text-caption text-text-secondary">
                    {c.cards.set_name} · {tradeCardConditionLabel(c)}
                  </p>
                </div>
                <span className="shrink-0 text-body font-bold tabular">{php(Number(c.estimated_value ?? 0))}</span>
                <Link
                  href={buildUrl(offerIds.filter((id) => id !== c.id), wantIds)}
                  aria-label={`Remove ${c.cards.name} from You Offer`}
                  className="grid size-8 shrink-0 place-items-center rounded-md text-text-secondary hover:bg-bg-muted"
                >
                  <X className="size-4" />
                </Link>
              </li>
            ))}
          </ul>

          <button
            onClick={() => setOfferPickerOpen(true)}
            className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-body font-medium text-text-secondary hover:bg-bg-muted"
          >
            <Plus className="size-4" /> Add More Cards
          </button>

          <div className="mt-3 flex items-center justify-between rounded-md bg-bg-muted px-3 py-2.5">
            <span className="text-body text-text-secondary">Total Offered Value</span>
            <span className="text-body font-bold tabular">{php(offeredValue)}</span>
          </div>
        </div>

        {/* ---- You Want ---- */}
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-h3 font-semibold">
              You Want
              <span className="rounded-full bg-bg-muted px-2 py-0.5 text-caption font-medium tabular">
                {wanted.length}
              </span>
            </h3>
            <button
              onClick={() => setWantPickerOpen(true)}
              className="flex h-9 items-center gap-1 rounded-md border border-border px-3 text-caption font-medium hover:bg-bg-muted"
            >
              <Plus className="size-3.5" /> Find Cards
            </button>
          </div>
          <p className="mt-1 text-caption text-text-secondary">These are the cards you&apos;re looking to receive.</p>

          <ul className="mt-2 flex flex-col divide-y divide-border">
            {wanted.map((l) => (
              <li key={l.id} className="flex items-center gap-2 py-2">
                <div className="relative size-11 shrink-0 overflow-hidden rounded-md bg-bg-muted">
                  <CardArt name={l.cards.name} src={l.cards.image_url} sizes="44px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium">{l.cards.name}</p>
                  <p className="truncate text-caption text-text-secondary">
                    {l.cards.set_name} · {conditionLabel(l)}
                  </p>
                </div>
                <span className="shrink-0 text-body font-bold tabular">{php(l.price)}</span>
                <Link
                  href={buildUrl(offerIds, wantIds.filter((id) => id !== l.id))}
                  aria-label={`Remove ${l.cards.name} from You Want`}
                  className="grid size-8 shrink-0 place-items-center rounded-md text-text-secondary hover:bg-bg-muted"
                >
                  <X className="size-4" />
                </Link>
              </li>
            ))}
          </ul>

          <button
            onClick={() => setWantPickerOpen(true)}
            className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-body font-medium text-text-secondary hover:bg-bg-muted"
          >
            <Plus className="size-4" /> Add More Cards
          </button>

          <div className="mt-3 flex items-center justify-between rounded-md bg-bg-muted px-3 py-2.5">
            <span className="text-body text-text-secondary">Total Requested Value</span>
            <span className="text-body font-bold tabular">{php(requestedValue)}</span>
          </div>
        </div>

        {/* Swap icon between the two columns, desktop only — visual only. */}
        <span
          aria-hidden
          className="absolute top-1/2 left-1/2 hidden size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-white shadow-elevated lg:grid"
        >
          <RefreshCw className="size-4" />
        </span>
      </div>

      {/* ---- Value Difference + Find Matching Trades ---- */}
      <div className="mt-4 flex flex-col gap-3 rounded-lg border border-border bg-bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Scale className="mt-0.5 size-5 shrink-0 text-text-secondary" />
          <div>
            <p className="text-body font-medium">
              {diff === 0
                ? "Even trade"
                : diff > 0
                  ? `${php(diff)} more on their side`
                  : `${php(Math.abs(diff))} more on your side`}
            </p>
            <p className="text-caption text-text-secondary">
              You can add more cards or request a balance adjustment.
            </p>
          </div>
        </div>
        <Link
          href="/trade?tab=find-a-trade"
          className="flex h-11 shrink-0 items-center justify-center rounded-md bg-primary px-5 text-body font-medium text-white hover:bg-primary-hover"
        >
          Find Matching Trades
        </Link>
      </div>

      {canPropose && (
        <form action={proposeTrade} className="mt-4">
          {offerIds.map((id) => <input key={id} type="hidden" name="offered" value={id} />)}
          {wantIds.map((id) => <input key={id} type="hidden" name="wanted" value={id} />)}
          <button className="h-11 w-full rounded-md bg-primary text-body font-medium text-white active:scale-[0.98]">
            Submit Trade Proposal
          </button>
        </form>
      )}

      {/* ---- Add Card picker (You Offer) ---- */}
      <SlideOver open={offerPickerOpen} onClose={() => setOfferPickerOpen(false)} title="Add cards to offer">
        <form method="get" action="/trade" className="flex flex-col gap-4">
          <input type="hidden" name="tab" value="my-trade-cards" />
          {wantIds.map((id) => <input key={id} type="hidden" name="want" value={id} />)}
          {availableTradeCards.length === 0 ? (
            <p className="text-body text-text-secondary">
              No available cards yet — add some from &quot;Add Cards for Trade&quot; above first.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {availableTradeCards.map((c) => (
                <li key={c.id}>
                  <label className="flex h-14 items-center gap-3">
                    <input
                      type="checkbox" name="offer" value={c.id}
                      defaultChecked={offerIds.includes(c.id)}
                      className="size-4 accent-[var(--color-primary)]"
                    />
                    <span className="flex-1 truncate text-body">{c.cards.name}</span>
                    <span className="text-body tabular text-text-secondary">{php(Number(c.estimated_value ?? 0))}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <button className="h-11 rounded-md bg-primary text-body font-medium text-white active:scale-[0.98]">
            Update You Offer
          </button>
        </form>
      </SlideOver>

      {/* ---- Find Cards picker (You Want) ---- */}
      <SlideOver open={wantPickerOpen} onClose={() => setWantPickerOpen(false)} title="Find cards you want">
        <form method="get" action="/trade" className="flex flex-col gap-4">
          <input type="hidden" name="tab" value="my-trade-cards" />
          {offerIds.map((id) => <input key={id} type="hidden" name="offer" value={id} />)}
          {listingPool.length === 0 ? (
            <p className="text-body text-text-secondary">No trade-eligible listings available right now.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {listingPool.map((l) => (
                <li key={l.id}>
                  <label className="flex h-14 items-center gap-3">
                    <input
                      type="checkbox" name="want" value={l.id}
                      defaultChecked={wantIds.includes(l.id)}
                      className="size-4 accent-[var(--color-primary)]"
                    />
                    <span className="flex-1 truncate text-body">{l.cards.name}</span>
                    <span className="truncate text-caption text-text-secondary">{l.shops.name}</span>
                    <span className="text-body tabular text-text-secondary">{php(l.price)}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <button className="h-11 rounded-md bg-primary text-body font-medium text-white active:scale-[0.98]">
            Update You Want
          </button>
        </form>
      </SlideOver>
    </section>
  );
}
