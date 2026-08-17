import { tradeCardConditionLabel, type TradeCardWithCard } from "@/lib/supabase/types";
import { php } from "@/lib/utils";
import { StatusPill } from "@/components/shared/StatusPill";
import { CardArt } from "@/components/buyer/CardArt";
import { removeTradeCard } from "@/app/trade/actions";

/**
 * "My Trade Cards" — the buyer's own tradeable inventory. Matches
 * TRADE HOME PANEL.png's grid (image, name, set, condition badge, value,
 * Remove) with the count badge + "Manage Inventory" pattern; that link is a
 * same-page anchor since no separate inventory route exists or is specced.
 */
export function TradeCardGrid({ cards }: { cards: TradeCardWithCard[] }) {
  return (
    <section id="my-trade-cards" className="rounded-lg border border-border bg-bg p-(--card-pad)">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-h2 font-semibold">My Trade Cards</h2>
          <span className="rounded-full bg-primary-subtle px-2.5 py-0.5 text-caption font-medium text-primary tabular">
            {cards.length} cards
          </span>
        </div>
        <a href="#my-trade-cards" className="text-body font-medium text-primary hover:underline">
          Manage Inventory →
        </a>
      </div>
      <p className="mt-1 text-body text-text-secondary">
        These are the cards you&apos;ve added and are available for trading.
      </p>

      {cards.length === 0 ? (
        <p className="mt-4 text-body text-text-secondary">
          No cards yet — use &quot;Add Cards for Trade&quot; above to start building your inventory.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {cards.map((c) => (
            <li key={c.id} className="flex flex-col overflow-hidden rounded-lg border border-border">
              <div className="relative aspect-[5/7] overflow-hidden bg-bg-muted">
                <span className="absolute top-2 left-2 z-10 rounded-md bg-grade-bg px-2 py-0.5 text-caption font-medium text-grade-text">
                  {tradeCardConditionLabel(c)}
                </span>
                <CardArt name={c.cards.name} src={c.cards.image_url} sizes="(min-width: 1024px) 16vw, 40vw" />
              </div>
              <div className="flex flex-1 flex-col gap-0.5 p-3">
                <p className="truncate text-body font-medium">{c.cards.name}</p>
                <p className="truncate text-caption text-text-secondary">{c.cards.set_name}</p>
                <p className="mt-1 text-body font-bold tabular">{php(Number(c.estimated_value ?? 0))}</p>
                <p className="text-caption text-text-secondary">Est. Value</p>
                <div className="mt-2">
                  {c.status !== "available" ? (
                    <StatusPill tone={c.status === "traded" ? "success" : "attention"}>
                      {c.status.replace("_", " ")}
                    </StatusPill>
                  ) : (
                    <form action={removeTradeCard}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="h-11 w-full rounded-md border border-border text-caption font-medium text-text-secondary hover:bg-bg-muted">
                        Remove
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
