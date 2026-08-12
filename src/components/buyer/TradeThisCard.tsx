import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/**
 * "Trade This Card" — the CTA reuses the exact `/trade?want=&shop=` pre-fill
 * link `BuyActions`'s "Trade for This Card" already uses; no new server
 * action or query-param plumbing. Signed-in buyers additionally see a small
 * teaser of their own tradeable cards, using the same `trade_cards` query
 * `src/app/trade/page.tsx` already runs.
 */
export async function TradeThisCard({
  userId,
  listingId,
  shopId,
}: {
  userId: string | null;
  listingId: string;
  shopId: string;
}) {
  let myCards: { id: string; status: string; cards: { name: string } | null }[] = [];
  if (userId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("trade_cards")
      .select("id, status, cards(name)")
      .eq("owner_id", userId)
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(4);
    myCards = (data ?? []) as unknown as typeof myCards;
  }

  return (
    <section className="mt-6 rounded-lg border border-border bg-bg p-(--card-pad)">
      <h2 className="text-h3 font-semibold">Trade This Card</h2>

      {myCards.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1.5">
          {myCards.map((c) => (
            <li key={c.id} className="text-body text-text-secondary">
              {c.cards?.name ?? "Unnamed card"}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-body text-text-secondary">
          {userId
            ? "You don't have any cards available to trade yet — add some from your Trade Hub."
            : "Sign in to see your tradeable cards."}
        </p>
      )}

      <Link
        href={`/trade?want=${listingId}&shop=${shopId}`}
        className="mt-4 flex h-11 items-center justify-center rounded-md border border-primary text-body font-medium text-primary transition-colors duration-(--duration-instant) hover:bg-primary-subtle"
      >
        Offer a Trade
      </Link>
    </section>
  );
}
