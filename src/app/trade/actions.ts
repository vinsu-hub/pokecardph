"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

/**
 * Every trade mutation lives here.
 *
 * THE RULE: status advances only through these actions, and every transition
 * writes a `trade_activity` row. A status change that silently fails to log
 * is worse than one that fails outright — the Activity feed is the only record
 * both parties can point at when a meetup goes wrong.
 */

type Status =
  | "proposed" | "accepted" | "plan_created" | "meetup_scheduled"
  | "cards_verified" | "value_confirmed" | "completed"
  | "cancelled" | "declined";

/** Forward-only ladder. Anything not listed here is a terminal action. */
const NEXT: Partial<Record<Status, Status>> = {
  proposed: "accepted",
  accepted: "plan_created",
  plan_created: "meetup_scheduled",
  meetup_scheduled: "cards_verified",
  cards_verified: "value_confirmed",
  value_confirmed: "completed",
};

const LABEL: Record<Status, string> = {
  proposed: "proposed a trade",
  accepted: "accepted the trade",
  plan_created: "created the trade plan",
  meetup_scheduled: "scheduled the meetup",
  cards_verified: "verified the cards",
  value_confirmed: "confirmed the final value",
  completed: "completed the trade",
  cancelled: "cancelled the trade",
  declined: "declined the trade",
};

/** Both parties to a trade, plus which side the caller is on. */
async function authorize(tradeId: string) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/trade/${tradeId}`);

  const supabase = await createClient();
  const { data: trade } = await supabase
    .from("trades")
    .select("*")
    .eq("id", tradeId)
    .maybeSingle();

  if (!trade) throw new Error("Trade not found");

  const isProposer = trade.proposer_id === user.id;
  const isVendor = user.shopId != null && trade.shop_id === user.shopId;
  // RLS would block this anyway; failing here gives a clear error rather than
  // an empty result the UI has to interpret.
  if (!isProposer && !isVendor) throw new Error("Not a party to this trade");

  return { user, supabase, trade, isProposer, isVendor };
}

async function transition(tradeId: string, to: Status, note?: string) {
  const { user, supabase, trade } = await authorize(tradeId);

  const patch: Record<string, unknown> = { status: to, updated_at: new Date().toISOString() };
  const { error } = await supabase.from("trades").update(patch).eq("id", tradeId);
  if (error) throw new Error(error.message);

  const { error: logErr } = await supabase.from("trade_activity").insert({
    trade_id: tradeId,
    actor_id: user.id,
    action: to,
    note: note ?? LABEL[to],
  });
  // Roll the status back rather than leave an unlogged transition standing.
  if (logErr) {
    await supabase.from("trades").update({ status: trade.status }).eq("id", tradeId);
    throw new Error(`Could not log transition: ${logErr.message}`);
  }

  revalidatePath(`/trade/${tradeId}`);
  revalidatePath("/vendor/trade-requests");
}

/** Advance one rung. Guarded so a stale form can't skip states. */
export async function advanceTrade(formData: FormData) {
  const tradeId = String(formData.get("tradeId"));
  const from = String(formData.get("from")) as Status;
  const to = NEXT[from];
  if (!to) throw new Error(`No forward transition from ${from}`);
  await transition(tradeId, to);
}

export async function acceptTrade(formData: FormData) {
  await transition(String(formData.get("tradeId")), "accepted");
}

export async function declineTrade(formData: FormData) {
  const tradeId = String(formData.get("tradeId"));
  const { supabase } = await authorize(tradeId);
  await transition(tradeId, "declined");
  await releaseCards(supabase, tradeId);
}

export async function cancelTrade(formData: FormData) {
  const tradeId = String(formData.get("tradeId"));
  const { supabase } = await authorize(tradeId);
  await transition(tradeId, "cancelled");
  await releaseCards(supabase, tradeId);
}

/** Completing settles both inventories. */
export async function completeTrade(formData: FormData) {
  const tradeId = String(formData.get("tradeId"));
  const { supabase } = await authorize(tradeId);
  await transition(tradeId, "completed");

  const { data: items } = await supabase
    .from("trade_items")
    .select("trade_card_id")
    .eq("trade_id", tradeId)
    .eq("side", "offered");

  const ids = (items ?? []).map((i) => i.trade_card_id).filter(Boolean) as string[];
  if (ids.length) {
    await supabase.from("trade_cards").update({ status: "traded" }).in("id", ids);
  }
}

/** Cancelled or declined — the proposer's cards go back on the shelf. */
async function releaseCards(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tradeId: string,
) {
  const { data: items } = await supabase
    .from("trade_items")
    .select("trade_card_id")
    .eq("trade_id", tradeId)
    .eq("side", "offered");

  const ids = (items ?? []).map((i) => i.trade_card_id).filter(Boolean) as string[];
  if (ids.length) {
    await supabase.from("trade_cards").update({ status: "available" }).in("id", ids);
  }
}

export async function setMeetup(formData: FormData) {
  const tradeId = String(formData.get("tradeId"));
  const { user, supabase } = await authorize(tradeId);

  const locationId = String(formData.get("locationId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");

  const { data: loc } = await supabase
    .from("meetup_locations")
    .select("name, address")
    .eq("id", locationId)
    .maybeSingle();

  const { error } = await supabase
    .from("trades")
    .update({
      meetup_location_name: loc?.name ?? null,
      meetup_location_address: loc?.address ?? null,
      meetup_date: date || null,
      meetup_time: time || null,
      status: "meetup_scheduled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", tradeId);
  if (error) throw new Error(error.message);

  await supabase.from("trade_activity").insert({
    trade_id: tradeId,
    actor_id: user.id,
    action: "meetup_scheduled",
    note: `set the meetup at ${loc?.name ?? "a location"}${date ? ` on ${date}` : ""}${time ? ` at ${time}` : ""}`,
  });

  revalidatePath(`/trade/${tradeId}`);
}

/** Add one of the buyer's own cards to their tradeable inventory. */
export async function addTradeCard(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/trade");

  const supabase = await createClient();
  const { error } = await supabase.from("trade_cards").insert({
    owner_id: user.id,
    card_id: String(formData.get("cardId")),
    condition: String(formData.get("condition") || "NM"),
    estimated_value: Number(formData.get("value") || 0),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/trade");
}

export async function removeTradeCard(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/trade");
  const supabase = await createClient();
  await supabase
    .from("trade_cards")
    .delete()
    .eq("id", String(formData.get("id")))
    .eq("owner_id", user.id);
  revalidatePath("/trade");
}

/**
 * Create a proposal: the trade, both sides of trade_items, the opening
 * activity row, and the hold on the proposer's cards.
 */
export async function proposeTrade(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/trade");
  const supabase = await createClient();

  const offered = formData.getAll("offered").map(String).filter(Boolean);
  const wantedListingId = String(formData.get("wanted") ?? "");
  if (!offered.length || !wantedListingId) throw new Error("Pick at least one card on each side");

  const { data: listing } = await supabase
    .from("listings")
    .select("id, price, shop_id")
    .eq("id", wantedListingId)
    .maybeSingle();
  if (!listing) throw new Error("Listing not found");

  const { data: cards } = await supabase
    .from("trade_cards")
    .select("id, estimated_value")
    .in("id", offered)
    .eq("owner_id", user.id);

  const offeredValue = (cards ?? []).reduce((s, c) => s + Number(c.estimated_value ?? 0), 0);
  const diff = Number(listing.price) - offeredValue;

  const { data: trade, error } = await supabase
    .from("trades")
    .insert({
      proposer_id: user.id,
      shop_id: listing.shop_id,
      status: "proposed",
      value_difference: Math.abs(diff),
      value_owed_by: diff === 0 ? null : diff > 0 ? "proposer" : "vendor",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const rows = [
    ...(cards ?? []).map((c) => ({
      trade_id: trade.id, side: "offered" as const,
      trade_card_id: c.id, listing_id: null,
      estimated_value: Number(c.estimated_value ?? 0),
    })),
    {
      trade_id: trade.id, side: "requested" as const,
      trade_card_id: null, listing_id: listing.id,
      estimated_value: Number(listing.price),
    },
  ];
  const { error: itemErr } = await supabase.from("trade_items").insert(rows);
  if (itemErr) throw new Error(itemErr.message);

  await supabase.from("trade_activity").insert({
    trade_id: trade.id, actor_id: user.id, action: "proposed",
    note: LABEL.proposed,
  });

  // Hold the offered cards so they can't be promised twice.
  await supabase
    .from("trade_cards")
    .update({ status: "pending_trade" })
    .in("id", offered)
    .eq("owner_id", user.id);

  redirect(`/trade/${trade.id}`);
}
