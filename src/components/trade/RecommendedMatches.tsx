import Link from "next/link";
import { CardArt } from "@/components/buyer/CardArt";
import { VerifiedMark } from "@/components/shared/VerifiedMark";
import { StatusPill } from "@/components/shared/StatusPill";
import { php } from "@/lib/utils";
import type { RecommendedMatch } from "@/app/trade/queries";

/**
 * TRADE HOME PANEL.png shows 4 quadrants per match (You Offer / They Have /
 * They Want / They're OK With). Only the first two are real here — there's
 * no `shop_wants` table or equivalent, and the Phase 3 spec's own guidance
 * for this section describes a one-directional trade_cards-vs-listings
 * overlap, not a bidirectional want-match. Building the other two would mean
 * inventing schema Phase 3 never specced, so this ships the honest 2-quadrant
 * version rather than fabricating "They Want"/"They're OK With" content.
 */
export function RecommendedMatches({ matches }: { matches: RecommendedMatch[] }) {
  return (
    <aside id="recommended-matches" className="rounded-lg border border-border bg-bg p-(--card-pad)">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-h3 font-semibold">Recommended Matches</h2>
        <Link href="/trade?tab=find-a-trade" className="text-caption font-medium text-primary hover:underline">
          See all →
        </Link>
      </div>
      <p className="mt-1 text-caption text-text-secondary">
        We found collectors with cards you want and who want cards you have.
      </p>

      {matches.length === 0 ? (
        <p className="mt-4 text-body text-text-secondary">
          No matches yet — add cards to your trade inventory to see collectors who have what you want.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {matches.map((m) => (
            <li key={m.shopId} className="rounded-lg border border-border p-3">
              <StatusPill tone="success">{m.matchPercent}% Match</StatusPill>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-caption font-medium text-text-secondary">You Offer</p>
                  <div className="relative mt-1 aspect-[5/7] w-14 overflow-hidden rounded-md bg-bg-muted">
                    <CardArt name={m.youOffer.name} src={m.youOffer.imageUrl} sizes="56px" />
                  </div>
                  <p className="mt-1 text-caption tabular text-text-secondary">{php(m.youOffer.estimatedValue)}</p>
                </div>
                <div>
                  <p className="text-caption font-medium text-text-secondary">They Have</p>
                  <div className="relative mt-1 aspect-[5/7] w-14 overflow-hidden rounded-md bg-bg-muted">
                    <CardArt name={m.theyHave.name} src={m.theyHave.imageUrl} sizes="56px" />
                  </div>
                  <p className="mt-1 text-caption tabular text-text-secondary">{php(m.theyHave.price)}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                <p className="flex min-w-0 items-center gap-1 truncate text-caption text-text-secondary">
                  <span className="truncate font-medium text-text-primary">{m.shopName}</span>
                  <VerifiedMark />
                  <span className="shrink-0">★ {m.rating.toFixed(1)} ({m.reviewCount})</span>
                </p>
                <Link
                  href={`/trade?tab=my-trade-cards&offer=${m.youOffer.id}&want=${m.theyHave.listingId}`}
                  className="flex h-9 shrink-0 items-center rounded-md border border-border px-3 text-caption font-medium hover:bg-bg-muted"
                >
                  Start This Trade
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
