/**
 * Hand-written row types for the Phase 1 schema. Narrower than generated types
 * on purpose — they describe what the UI actually consumes, so a schema change
 * that breaks a screen shows up as a type error rather than at runtime.
 */

export type ListingStatus = "draft" | "active" | "sold" | "removed";
export type OrderStatus =
  | "pending"
  | "paid"
  | "preparing"
  | "shipped"
  | "completed"
  | "cancelled";

export type Card = {
  id: string;
  name: string;
  set_name: string;
  card_number: string | null;
  rarity: string | null;
  language: string | null;
  image_url: string | null;
  generation: string | null;
  pull_rate: string | null;
  /** Added by 0022_manual_card_entry.sql, alongside find_or_create_card() —
   *  the vendor-typed print-variant fields that distinguish otherwise
   *  identical name+set+number cards. */
  illustrator: string | null;
  finish: string | null;
  edition: string | null;
};

export type Shop = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  location: string | null;
  tier: "free" | "premium";
  rating: number;
  review_count: number;
  follower_count: number;
  joined_at: string;
  trial_ends_at: string | null;
  trial_gmv_cap: number;
  trial_gmv_used: number;
  billing_status: "trial" | "active" | "past_due" | "restricted";
  is_beta_vendor: boolean;
  beta_registered_at: string | null;
};

export type Listing = {
  id: string;
  shop_id: string;
  /** Nullable since Phase 4 — sealed product, merch, and signed items have no
   *  catalog card. Only item_category = 'card' populates it. */
  card_id: string | null;
  listing_type: "graded" | "non_graded";
  /** Added by 0004_auctions.sql. */
  sale_type: "fixed" | "auction";
  item_category: "card" | "sealed_pack" | "sealed_box" | "merch" | "signed_item";
  grading_company: string | null;
  grade: string | null;
  cert_number: string | null;
  population: number | null;
  price: number;
  compare_price: number | null;
  quantity: number;
  condition_notes: string | null;
  description: string | null;
  /** jsonb — `[{ slot, url }]` as written by <ImageUpload>. Read it through
   *  the helpers in `lib/photos.ts` rather than casting: the column predates
   *  that shape and older rows may hold anything. */
  photos: unknown;
  status: ListingStatus;
  created_at: string;
  /** Added by 0001_base.sql, unused until Tier 2's real capture pipeline. */
  normal_map_url: string | null;
  /** Added by 0013_scan_tier.sql. Null = not yet scanned — the publish gate
   *  blocks status becoming 'active' without one. */
  scan_tier: "flat" | "full" | null;
  /** Added by 0019_card_detail_condition_and_price_history.sql, 0-10 each.
   *  Null on every listing seeded before that migration — CardCondition must
   *  hide its bar row rather than render a broken 0%-width bar. */
  condition_centering: number | null;
  condition_corners: number | null;
  condition_edges: number | null;
  condition_surface: number | null;
};

/** A `price_history` row — added by
 *  0019_card_detail_condition_and_price_history.sql. Keyed by card + grade,
 *  not listing, since price history belongs to the card/grade pair rather
 *  than one vendor's one listing. */
export type PriceHistoryPoint = {
  id: string;
  card_id: string;
  grade: string;
  price: number;
  recorded_at: string;
};

/** A listing joined to its catalog card and owning shop — the shape every
 *  browse/detail surface actually renders. */
export type ListingCard = Listing & {
  cards: Card;
  shops: Shop;
};

/** The condition badge shown top-left of every card image. One recognition
 *  pattern buyers learn once — derived in exactly one place. */
export function conditionLabel(l: Pick<Listing, "listing_type" | "grading_company" | "grade">) {
  if (l.listing_type === "graded" && l.grading_company && l.grade) {
    return `${l.grading_company} ${l.grade}`;
  }
  return "Non-Graded";
}

/** A buyer's own tradeable card — `trade_cards`, added by
 *  0003_trades.sql. Distinct from `Listing`: it belongs to a person, not a
 *  shop, and has no `listing_type`/`sale_type`/pricing columns of its own. */
export type TradeCard = {
  id: string;
  owner_id: string;
  card_id: string;
  condition: string | null;
  grading_company: string | null;
  grade: string | null;
  estimated_value: number | null;
  photos: unknown;
  status: "available" | "pending_trade" | "traded";
  created_at: string;
};

export type TradeCardWithCard = TradeCard & { cards: Card };

/** Same recognition pattern as `conditionLabel`, for `trade_cards` rows —
 *  which have no `listing_type` to key off, just a graded/non-graded pair of
 *  columns plus a free-text `condition` (e.g. "NM") for ungraded cards. */
export function tradeCardConditionLabel(
  c: Pick<TradeCard, "grading_company" | "grade" | "condition">,
) {
  if (c.grading_company && c.grade) return `${c.grading_company} ${c.grade}`;
  return c.condition || "Non-Graded";
}
