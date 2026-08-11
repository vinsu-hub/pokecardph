"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Join button for an Action Event. Mirrors BiddingPanel's fetch-then-refresh
 * shape rather than a Server Action, for consistency with how bidding on this
 * same page already works.
 */
export function JoinEventButton({
  auctionId,
  alreadyJoined,
  signedIn,
  full,
}: {
  auctionId: string;
  alreadyJoined: boolean;
  signedIn: boolean;
  full: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(alreadyJoined);

  if (!signedIn) {
    return (
      <a
        href={`/login?next=/auctions/${auctionId}`}
        className="flex h-11 w-full items-center justify-center rounded-md bg-primary text-body font-medium text-white"
      >
        Sign in to join
      </a>
    );
  }

  if (joined) {
    return (
      <span className="flex h-11 w-full items-center justify-center gap-1.5 rounded-md bg-success-bg text-body font-medium text-success">
        ✓ You&apos;re in — place your bid below
      </span>
    );
  }

  if (full) {
    return (
      <span className="flex h-11 w-full items-center justify-center rounded-md border border-border text-body font-medium text-text-muted">
        Event full
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = await fetch(`/api/auctions/${auctionId}/join`, { method: "POST" });
          const data = await res.json();
          setBusy(false);
          if (!data.ok) {
            setError(data.error ?? "Couldn't join — try again");
            return;
          }
          setJoined(true);
          router.refresh();
        }}
        className="h-11 w-full rounded-md bg-primary text-body font-medium text-white transition-transform duration-(--duration-instant) active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? "Joining…" : "Join Event"}
      </button>
      {error && <p className="text-caption text-danger">{error}</p>}
    </div>
  );
}
