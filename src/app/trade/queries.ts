import type { createClient } from "@/lib/supabase/server";

/**
 * Read-only Trade Hub queries. Kept out of actions.ts on purpose — that
 * file's own doc comment says "every trade mutation lives here," and these
 * are reads.
 */

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type RecommendedMatch = {
  shopId: string;
  shopName: string;
  rating: number;
  reviewCount: number;
  matchPercent: number;
  youOffer: { id: string; name: string; imageUrl: string | null; estimatedValue: number };
  theyHave: { listingId: string; name: string; imageUrl: string | null; price: number };
};

/**
 * Phase 3 spec, verbatim: "a simple SQL query comparing trade_cards against
 * active listings by card_id overlap; doesn't need to be a smart algorithm
 * yet." This is exactly that — one overlap pass, grouped by shop, no ranking
 * beyond match %. Returns [] (not fabricated rows) when the buyer has no
 * available trade cards or nothing overlaps.
 */
export async function getRecommendedMatches(
  supabase: Supabase,
  userId: string,
): Promise<RecommendedMatch[]> {
  const { data: myCards } = await supabase
    .from("trade_cards")
    .select("id, card_id, estimated_value, cards(name, image_url)")
    .eq("owner_id", userId)
    .eq("status", "available");

  const cards = (myCards ?? []) as unknown as {
    id: string; card_id: string; estimated_value: number | null;
    cards: { name: string; image_url: string | null } | null;
  }[];
  if (cards.length === 0) return [];

  const myCardIds = [...new Set(cards.map((c) => c.card_id))];
  const byCardId = new Map(cards.map((c) => [c.card_id, c]));

  const { data: overlapping } = await supabase
    .from("listings")
    .select("id, card_id, price, shop_id, cards(name, image_url), shops(name, rating, review_count)")
    .in("card_id", myCardIds)
    .eq("status", "active");

  const rows = (overlapping ?? []) as unknown as {
    id: string; card_id: string; price: number; shop_id: string;
    cards: { name: string; image_url: string | null } | null;
    shops: { name: string; rating: number; review_count: number } | null;
  }[];
  if (rows.length === 0) return [];

  // Group by shop: distinct overlapping card_ids + one representative listing.
  const byShop = new Map<string, { listings: typeof rows; cardIds: Set<string> }>();
  for (const r of rows) {
    if (!r.cards || !r.shops) continue;
    const entry = byShop.get(r.shop_id) ?? { listings: [], cardIds: new Set<string>() };
    entry.listings.push(r);
    entry.cardIds.add(r.card_id);
    byShop.set(r.shop_id, entry);
  }

  const matches: RecommendedMatch[] = [];
  for (const [shopId, { listings, cardIds }] of byShop) {
    const representative = listings[0];
    const myCard = byCardId.get(representative.card_id);
    if (!myCard?.cards) continue;

    matches.push({
      shopId,
      shopName: representative.shops!.name,
      rating: representative.shops!.rating,
      reviewCount: representative.shops!.review_count,
      matchPercent: Math.round((cardIds.size / myCardIds.length) * 100),
      youOffer: {
        id: myCard.id,
        name: myCard.cards.name,
        imageUrl: myCard.cards.image_url,
        estimatedValue: Number(myCard.estimated_value ?? 0),
      },
      theyHave: {
        listingId: representative.id,
        name: representative.cards!.name,
        imageUrl: representative.cards!.image_url,
        price: Number(representative.price),
      },
    });
  }

  return matches.sort((a, b) => b.matchPercent - a.matchPercent).slice(0, 5);
}

/** Active, trade-eligible listings — shared by the Find a Trade tab and the
 *  "+ Find Cards" picker so both draw from the same pool. */
export async function getTradeEligibleListingPool(supabase: Supabase, limit = 100) {
  const { data } = await supabase
    .from("listings")
    .select("*, cards(*), shops(*)")
    .eq("status", "active")
    .eq("sale_type", "fixed")
    .not("card_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
