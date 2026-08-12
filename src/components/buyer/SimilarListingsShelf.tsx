import { createClient } from "@/lib/supabase/server";
import type { Card, ListingCard } from "@/lib/supabase/types";
import { ListingCardTile } from "./ListingCardTile";
import { HorizontalScroller } from "./HorizontalScroller";

/**
 * "You Might Also Like" — active fixed-price listings sharing the current
 * card's set + rarity, excluding the current listing. Widens to rarity-only
 * if the stricter match returns fewer than 4 rows (the seed catalog is
 * small), and hides the whole section if still empty.
 */
export async function SimilarListingsShelf({
  card,
  currentListingId,
}: {
  card: Card;
  currentListingId: string;
}) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("listings")
    .select("*, cards!inner(*), shops(*)")
    .eq("status", "active")
    .eq("sale_type", "fixed")
    .neq("id", currentListingId)
    .eq("cards.set_name", card.set_name)
    .eq("cards.rarity", card.rarity)
    .limit(10);

  let similar = ((data ?? []) as unknown as ListingCard[]).filter((l) => l.cards);

  if (similar.length < 4) {
    const { data: wider } = await supabase
      .from("listings")
      .select("*, cards!inner(*), shops(*)")
      .eq("status", "active")
      .eq("sale_type", "fixed")
      .neq("id", currentListingId)
      .eq("cards.rarity", card.rarity)
      .limit(10);
    similar = ((wider ?? []) as unknown as ListingCard[]).filter((l) => l.cards);
  }

  if (similar.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="text-h3 font-semibold">You Might Also Like</h2>
      <HorizontalScroller className="mt-3 pb-2">
        {similar.map((l) => (
          <div key={l.id} className="w-[160px] shrink-0 sm:w-[200px]">
            <ListingCardTile listing={l} />
          </div>
        ))}
      </HorizontalScroller>
    </section>
  );
}
