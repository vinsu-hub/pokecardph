"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Countdown } from "./Countdown";
import { php, cn } from "@/lib/utils";
import { play } from "@/lib/audio";

type Auction = {
  id: string;
  starting_bid: number;
  bid_increment: number;
  current_bid: number | null;
  bid_count: number;
  end_time: string;
  status: string;
  buy_it_now_price: number | null;
  reserve_price: number | null;
};

/**
 * The bidding panel. Subscribes to its own auction row over Realtime, so the
 * current bid and count update without a refresh.
 *
 * Deliberately silent on incoming bids: they're Realtime-driven, the user
 * didn't trigger them, and the design system forbids Realtime updates from
 * stealing focus. The value flashes --color-primary-subtle and settles. The
 * only cue here is winning, and that is about you.
 */
/** Floor for the next legal bid. */
function initialMin(a: Pick<Auction, "current_bid" | "starting_bid" | "bid_increment">) {
  return a.current_bid == null
    ? Number(a.starting_bid)
    : Number(a.current_bid) + Number(a.bid_increment);
}

export function BiddingPanel({
  auction: initial,
  isVendorOwn,
  signedIn,
  reserveMet,
}: {
  auction: Auction;
  isVendorOwn: boolean;
  signedIn: boolean;
  reserveMet: boolean;
}) {
  const router = useRouter();
  const [auction, setAuction] = useState(initial);
  const [amount, setAmount] = useState<string>(() => String(initialMin(initial)));
  const [useMax, setUseMax] = useState(false);
  const [maxProxy, setMaxProxy] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "warn" | "err"; text: string } | null>(null);
  const [flash, setFlash] = useState(false);

  const minBid = initialMin(auction);

  // When a rival bid raises the floor, follow it up. Adjusted during render
  // rather than in an effect — React's documented pattern for state that has
  // to track a changing input, and it avoids the extra render an effect costs.
  const [prevMin, setPrevMin] = useState(minBid);
  if (prevMin !== minBid) {
    setPrevMin(minBid);
    setAmount(String(minBid));
  }

  // Realtime — the row update is the broadcast; there's no separate channel.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`auction-${auction.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "auctions", filter: `id=eq.${auction.id}` },
        (payload) => {
          const next = payload.new as Auction;
          setAuction((prev) => {
            if (Number(next.current_bid) !== Number(prev.current_bid)) {
              setFlash(true);
              setTimeout(() => setFlash(false), 400);
            }
            return { ...prev, ...next };
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [auction.id]);

  async function bid(value: number, proxy: number | null) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/auctions/${auction.id}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value, maxProxy: proxy }),
      });
      const data = await res.json();
      if (!data.ok) {
        setMsg({ kind: "err", text: data.error ?? "Could not place bid" });
      } else if (data.outbid) {
        setMsg({ kind: "warn", text: data.message });
      } else {
        setMsg({
          kind: "ok",
          text: data.extended
            ? "Bid placed — the auction was extended by 2 minutes"
            : "You're the highest bidder",
        });
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const ended = auction.status.startsWith("ended") || auction.status === "cancelled";

  return (
    <div className="rounded-lg border border-border bg-bg p-(--card-pad)">
      <p className="text-caption text-text-secondary">
        {auction.current_bid == null ? "Starting bid" : "Current bid"}
      </p>
      <p
        className={cn(
          "rounded-md px-1 text-display font-bold tabular transition-colors duration-(--duration-base)",
          flash ? "bg-primary-subtle" : "bg-transparent",
        )}
      >
        {php(Number(auction.current_bid ?? auction.starting_bid))}
      </p>
      <p className="mt-1 text-caption text-text-secondary">
        <span className="tabular">{auction.bid_count}</span> bid
        {auction.bid_count === 1 ? "" : "s"} ·{" "}
        <Countdown endsAt={auction.end_time} />
      </p>

      {auction.reserve_price != null && !reserveMet && (
        // Never reveals the amount.
        <p className="mt-2 text-caption text-text-secondary">Reserve not yet met</p>
      )}

      {ended ? (
        <p className="mt-4 rounded-md bg-bg-muted px-3 py-2 text-body text-text-secondary">
          This auction has ended.
        </p>
      ) : isVendorOwn ? (
        <p className="mt-4 rounded-md bg-bg-muted px-3 py-2 text-body text-text-secondary">
          This is your listing — you can&apos;t bid on it.
        </p>
      ) : !signedIn ? (
        <a
          href={`/login?next=/auctions/${auction.id}`}
          className="mt-4 flex h-11 items-center justify-center rounded-md bg-primary text-body font-medium text-white"
        >
          Sign in to bid
        </a>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="amount" className="text-caption font-medium">
              Your bid (minimum {php(minBid)})
            </label>
            <input
              id="amount"
              type="number"
              min={minBid}
              step={Number(auction.bid_increment)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 rounded-md border border-border px-3 text-body tabular outline-none focus:border-primary"
            />
          </div>

          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={useMax}
              onChange={(e) => setUseMax(e.target.checked)}
              className="size-4 accent-[var(--color-primary)]"
            />
            <span className="text-body">Set a maximum bid (bid for me automatically)</span>
          </label>

          {useMax && (
            <input
              type="number"
              min={amount}
              placeholder="Your maximum"
              value={maxProxy}
              onChange={(e) => setMaxProxy(e.target.value)}
              className="h-11 rounded-md border border-border px-3 text-body tabular outline-none focus:border-primary"
            />
          )}

          <button
            disabled={busy}
            onClick={() => bid(Number(amount), useMax && maxProxy ? Number(maxProxy) : null)}
            className="h-11 rounded-md bg-primary text-body font-medium text-white transition-transform duration-(--duration-instant) active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? "Placing bid…" : "Place Bid"}
          </button>

          {auction.buy_it_now_price != null && (
            <button
              disabled={busy}
              onClick={() => {
                play("auction-won");
                void bid(Number(auction.buy_it_now_price), null);
              }}
              className="h-11 rounded-md border border-primary text-body font-medium text-primary active:scale-[0.98] disabled:opacity-60"
            >
              Buy It Now — {php(Number(auction.buy_it_now_price))}
            </button>
          )}

          {msg && (
            <p
              className={cn(
                "rounded-md px-3 py-2 text-body",
                msg.kind === "ok" && "bg-success-bg text-success",
                msg.kind === "warn" && "bg-attention-bg text-attention",
                msg.kind === "err" && "bg-danger-bg text-danger",
              )}
            >
              {msg.text}
            </p>
          )}

          <p className="text-caption text-text-muted">
            Bids placed in the final 2 minutes extend the auction by 2 minutes.
          </p>
        </div>
      )}
    </div>
  );
}
