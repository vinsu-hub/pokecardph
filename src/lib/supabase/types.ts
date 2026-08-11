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
};

export type Shop = {
  id: string;
  name: string;
  logo_url: string | null;
  location: string | null;
  tier: "free" | "premium";
  rating: number;
  review_count: number;
  follower_count: number;
  joined_at: string;
};

export type Listing = {
  id: string;
  shop_id: string;
  card_id: string;
  listing_type: "graded" | "non_graded";
  grading_company: string | null;
  grade: string | null;
  cert_number: string | null;
  population: number | null;
  price: number;
  compare_price: number | null;
  quantity: number;
  condition_notes: string | null;
  description: string | null;
  status: ListingStatus;
  created_at: string;
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
