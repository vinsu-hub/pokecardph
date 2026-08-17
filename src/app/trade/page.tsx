import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { StatusPill } from "@/components/shared/StatusPill";
import { TradeHeroArt } from "@/components/trade/TradeHeroArt";
import { TradeHeroActions } from "@/components/trade/TradeHeroActions";
import { TradeCardGrid } from "@/components/trade/TradeCardGrid";
import { TradeBuilder } from "@/components/trade/TradeBuilder";
import { RecommendedMatches } from "@/components/trade/RecommendedMatches";
import { TrustFooterStrip } from "@/components/trade/TrustFooterStrip";
import { ListingResults } from "@/components/buyer/ListingResults";
import { getRecommendedMatches, getTradeEligibleListingPool } from "./queries";
import type { ListingCard, TradeCardWithCard } from "@/lib/supabase/types";

/**
 * Buyer Trade Hub — 1:1 structural rebuild of TRADE HOME PANEL.png (colors
 * follow the locked red/black/white design system, not the mockup's purple —
 * AGENTS.md: the design system wins on conflict). Tabs (My Trade Cards /
 * Find a Trade / My Trades) replace the previous left-sidebar layout by
 * explicit request, for 1:1 fidelity to this specific reference.
 *
 * Build-state (You Offer / You Want) lives in the `offer`/`want` URL params
 * rather than client state — see TradeBuilder's own doc comment for why.
 * `want` also carries the pre-existing `/card/[id]` "Trade for This Card"
 * deep link (`?want=<listingId>&shop=<shopId>`) forward unchanged; it just
 * seeds a length-1 array now instead of a single value.
 */

export const dynamic = "force-dynamic";

const TABS = [
  ["my-trade-cards", "My Trade Cards"],
  ["find-a-trade", "Find a Trade"],
  ["my-trades", "My Trades"],
] as const;

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function TradeHubPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; want?: string | string[]; offer?: string | string[]; shop?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/trade");

  const tab = sp.tab === "find-a-trade" || sp.tab === "my-trades" ? sp.tab : "my-trade-cards";
  const offerIds = toArray(sp.offer);
  const wantIds = toArray(sp.want);

  const supabase = await createClient();

  const [{ data: myCards }, { data: myTrades }, { data: catalog }, { data: wantedRows }, listingPool, matches] =
    await Promise.all([
      supabase
        .from("trade_cards")
        .select("*, cards(*)")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("trades")
        .select("*, shops(name)")
        .eq("proposer_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("cards").select("id, name, set_name").order("name").limit(30),
      wantIds.length
        ? supabase.from("listings").select("*, cards(*), shops(*)").in("id", wantIds)
        : Promise.resolve({ data: [] }),
      getTradeEligibleListingPool(supabase),
      tab === "my-trade-cards" ? getRecommendedMatches(supabase, user.id) : Promise.resolve([]),
    ]);

  const allCards = (myCards ?? []) as unknown as TradeCardWithCard[];
  const available = allCards.filter((c) => c.status === "available");
  const offered = available.filter((c) => offerIds.includes(c.id));
  const wanted = (wantedRows ?? []) as unknown as ListingCard[];

  return (
    <AppShell user={shellUser(user)}>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-display font-bold">Trade Pokémon Cards</h1>
            <p className="mt-1 max-w-[520px] text-body text-text-secondary">
              Find collectors who have the cards you want and want the cards you have.
            </p>
            <TradeHeroActions catalog={catalog ?? []} />
          </div>
          <TradeHeroArt />
        </header>

        <nav className="flex gap-1 border-b border-border" role="tablist" aria-label="Trade">
          {TABS.map(([value, label]) => (
            <Link
              key={value}
              href={`/trade?tab=${value}`}
              role="tab"
              aria-selected={tab === value}
              className={`flex h-11 items-center rounded-t-md px-4 text-body font-medium ${
                tab === value
                  ? "border-b-2 border-primary text-primary"
                  : "text-text-secondary hover:bg-bg-muted"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {tab === "my-trade-cards" && (
          <>
            <TradeCardGrid cards={allCards} />
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <TradeBuilder
                offered={offered}
                wanted={wanted}
                offerIds={offerIds}
                wantIds={wantIds}
                availableTradeCards={available}
                listingPool={listingPool as unknown as ListingCard[]}
              />
              <RecommendedMatches matches={matches} />
            </div>
            <TrustFooterStrip />
          </>
        )}

        {tab === "find-a-trade" && (
          <section>
            <h2 className="text-h2 font-semibold">Find a Trade</h2>
            <p className="mt-1 text-body text-text-secondary">
              Active, trade-eligible listings from every shop.
            </p>
            <div className="mt-4">
              <ListingResults listings={listingPool as unknown as ListingCard[]} view="grid" />
            </div>
          </section>
        )}

        {tab === "my-trades" && (
          <section>
            <h2 className="text-h2 font-semibold">My Trades</h2>
            {(myTrades?.length ?? 0) === 0 ? (
              <p className="mt-2 text-body text-text-secondary">No trades yet.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {myTrades!.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/trade/${t.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg p-4 hover:bg-bg-muted"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-body font-medium">Trade with {t.shops?.name}</p>
                        <p className="text-caption text-text-secondary">
                          {new Date(t.created_at).toLocaleDateString("en-PH")}
                        </p>
                      </div>
                      <StatusPill tone={toneFor(t.status)}>{t.status.replace(/_/g, " ")}</StatusPill>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}

export function toneFor(status: string) {
  if (status === "completed") return "success" as const;
  if (status === "cancelled" || status === "declined") return "danger" as const;
  if (status === "proposed") return "attention" as const;
  return "info" as const;
}
