import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { StatusPill } from "@/components/shared/StatusPill";
import { TradeProgress } from "@/components/trade/TradeProgress";
import { php } from "@/lib/utils";
import { toneFor } from "../page";
import {
  acceptTrade, declineTrade, cancelTrade, advanceTrade, completeTrade, setMeetup,
} from "../actions";

/**
 * Trade detail / progress — ONE page for both faces.
 *
 * Rendered conditionally on whether auth.uid() is the proposer or the shop's
 * vendor. The labels flip ("You're Offering" / "Vendor is Offering"), the
 * layout does not. Building two pages here would guarantee they drift.
 */

export const dynamic = "force-dynamic";

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}) {
  const { tradeId } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/trade/${tradeId}`);

  const supabase = await createClient();

  const { data: trade } = await supabase
    .from("trades")
    .select("*, shops(id, name, rating, location)")
    .eq("id", tradeId)
    .maybeSingle();
  if (!trade) notFound();

  const isProposer = trade.proposer_id === user.id;
  const isVendor = user.shopId != null && trade.shop_id === user.shopId;
  if (!isProposer && !isVendor) notFound();

  const [{ data: items }, { data: activity }, { data: locations }] = await Promise.all([
    supabase
      .from("trade_items")
      .select("*, trade_cards(*, cards(name, set_name)), listings(*, cards(name, set_name))")
      .eq("trade_id", tradeId),
    supabase
      .from("trade_activity")
      .select("*, profiles(display_name)")
      .eq("trade_id", tradeId)
      .order("created_at"),
    supabase.from("meetup_locations").select("*"),
  ]);

  const offered = (items ?? []).filter((i) => i.side === "offered");
  const requested = (items ?? []).filter((i) => i.side === "requested");

  // Labels flip with perspective; everything else is identical.
  const leftTitle = isProposer ? "You're Offering" : "Buyer is Offering";
  const rightTitle = isProposer ? "Vendor is Offering" : "You're Offering";

  const stamps: Record<string, string> = {};
  for (const a of activity ?? []) {
    stamps[a.action] ??= new Date(a.created_at).toLocaleString("en-PH", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
  }

  const owed = trade.value_owed_by;
  const dead = trade.status === "cancelled" || trade.status === "declined";
  const done = trade.status === "completed";

  return (
    <AppShell user={shellUser(user)}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <header className="flex flex-wrap items-center gap-3">
            <h1 className="text-display font-bold">
              Trade #{tradeId.slice(0, 8).toUpperCase()}
            </h1>
            <StatusPill tone={toneFor(trade.status)}>
              {trade.status.replace(/_/g, " ")}
            </StatusPill>
          </header>

          {/* ---- Two-card comparison ---- */}
          <section className="grid gap-3 rounded-lg border border-border bg-bg p-(--card-pad) sm:grid-cols-2">
            <Side title={leftTitle} accent items={offered} />
            <Side title={rightTitle} items={requested} />

            <div className="sm:col-span-2 border-t border-border pt-3">
              <p className="text-caption text-text-secondary">Value difference</p>
              <p className="text-h2 font-bold text-primary tabular">
                {php(Number(trade.value_difference ?? 0))}
              </p>
              <p className="text-caption text-text-secondary">
                {owed
                  ? `to be paid by ${owed === "proposer" ? (isProposer ? "you" : "the buyer") : isVendor ? "you" : "the vendor"}`
                  : "even trade"}
              </p>
            </div>
          </section>

          {!done && !dead && (
            <p className="rounded-lg bg-primary-subtle px-4 py-3 text-body text-text-secondary">
              <span className="font-medium text-primary">This trade is not yet final.</span>{" "}
              Meet at the agreed location to inspect both cards and confirm their
              values before completing.
            </p>
          )}

          {/* ---- Meetup ---- */}
          {!dead && !done && (
            <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
              <h2 className="text-h3 font-semibold">Choose a trading location</h2>
              <p className="mt-1 text-body text-text-secondary">
                Somewhere safe and public. Both parties confirm before inspecting cards.
              </p>
              <form action={setMeetup} className="mt-3 flex flex-col gap-3">
                <input type="hidden" name="tradeId" value={tradeId} />
                <ul className="flex flex-col gap-2">
                  {(locations ?? []).map((l) => (
                    <li key={l.id}>
                      <label className="flex min-h-11 items-center gap-3 rounded-md border border-border px-3 py-2">
                        <input type="radio" name="locationId" value={l.id} required className="size-4 accent-[var(--color-primary)]" />
                        <span className="flex-1">
                          <span className="block text-body font-medium">
                            {l.name}
                            {l.is_partner_shop && (
                              <span className="ml-2 rounded-full bg-primary-subtle px-2 py-0.5 text-caption text-primary">
                                Partner Shop
                              </span>
                            )}
                          </span>
                          <span className="block text-caption text-text-secondary">
                            {l.address}
                            {l.hours ? ` · ${l.hours}` : ""}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <input type="date" name="date" required className="h-11 rounded-md border border-border px-3 text-body" />
                  <input type="time" name="time" required className="h-11 rounded-md border border-border px-3 text-body" />
                  <button className="h-11 rounded-md bg-primary px-4 text-body font-medium text-white active:scale-[0.98]">
                    Confirm meetup
                  </button>
                </div>
                {trade.meetup_location_name && (
                  <p className="rounded-md bg-attention-bg px-3 py-2 text-caption text-attention">
                    Currently set: {trade.meetup_location_name}
                    {trade.meetup_date ? ` · ${trade.meetup_date}` : ""}
                    {trade.meetup_time ? ` ${trade.meetup_time}` : ""}
                  </p>
                )}
              </form>
            </section>
          )}

          {/* ---- Activity ---- */}
          <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
            <h2 className="text-h3 font-semibold">Activity</h2>
            <ul className="mt-3 flex flex-col gap-3">
              {(activity ?? []).map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3">
                  <p className="text-body">
                    <span className="font-medium">
                      {a.actor_id === user.id ? "You" : a.profiles?.display_name ?? "They"}
                    </span>{" "}
                    {a.note}
                  </p>
                  <time className="shrink-0 text-caption text-text-secondary tabular">
                    {new Date(a.created_at).toLocaleString("en-PH", {
                      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                    })}
                  </time>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ---- Right rail ---- */}
        <aside className="flex flex-col gap-4">
          <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
            <h2 className="text-h3 font-semibold">Trade Progress</h2>
            <div className="mt-4">
              <TradeProgress status={trade.status} timestamps={stamps} />
            </div>
          </section>

          <section className="flex flex-col gap-2 rounded-lg border border-border bg-bg p-(--card-pad)">
            <h2 className="text-h3 font-semibold">Trade Actions</h2>

            {/* Vendor decides on a fresh proposal. */}
            {isVendor && trade.status === "proposed" && (
              <>
                <Action action={acceptTrade} tradeId={tradeId} label="Accept Trade" primary />
                <Action action={declineTrade} tradeId={tradeId} label="Decline Trade" danger />
              </>
            )}

            {/* Either party moves the plan forward once accepted. */}
            {!dead && !done && trade.status !== "proposed" && trade.status !== "value_confirmed" && (
              <form action={advanceTrade}>
                <input type="hidden" name="tradeId" value={tradeId} />
                <input type="hidden" name="from" value={trade.status} />
                <button className="h-11 w-full rounded-md bg-primary text-body font-medium text-white active:scale-[0.98]">
                  Advance to next step
                </button>
              </form>
            )}

            {!dead && trade.status === "value_confirmed" && (
              <Action action={completeTrade} tradeId={tradeId} label="Complete Trade" primary />
            )}

            {!dead && !done && (
              <Action action={cancelTrade} tradeId={tradeId} label="Cancel Trade" danger />
            )}

            {done && (
              <p className="rounded-md bg-success-bg px-3 py-2 text-body text-success">
                Trade completed. Both inventories have been updated.
              </p>
            )}
          </section>
        </aside>
      </div>
    </AppShell>
  );
}

type Item = {
  id: string;
  estimated_value: number | null;
  trade_cards: { cards: { name: string; set_name: string } } | null;
  listings: { cards: { name: string; set_name: string } | null } | null;
};

function Side({ title, items, accent }: { title: string; items: Item[]; accent?: boolean }) {
  return (
    <div>
      <h3 className={`text-h3 font-semibold ${accent ? "text-primary" : ""}`}>{title}</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((i) => {
          const c = i.trade_cards?.cards ?? i.listings?.cards;
          return (
            <li key={i.id} className="rounded-md border border-border p-3">
              <p className="truncate text-body font-medium">{c?.name ?? "Card"}</p>
              <p className="truncate text-caption text-text-secondary">{c?.set_name}</p>
              <p className="mt-1 text-body font-bold tabular">
                {php(Number(i.estimated_value ?? 0))}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Action({
  action, tradeId, label, primary, danger,
}: {
  action: (fd: FormData) => Promise<void>;
  tradeId: string;
  label: string;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="tradeId" value={tradeId} />
      <button
        className={`h-11 w-full rounded-md text-body font-medium transition-transform duration-(--duration-instant) active:scale-[0.98] ${
          primary
            ? "bg-primary text-white"
            : danger
              ? "border border-danger text-danger"
              : "border border-border"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
