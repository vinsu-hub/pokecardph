import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { StatusPill } from "@/components/shared/StatusPill";
import { php } from "@/lib/utils";
import { addTradeCard, removeTradeCard, proposeTrade } from "./actions";

/**
 * Buyer Trade Hub — My Trade Cards, Build Your Trade, and My Trades.
 *
 * Layout note: TRADE HOME PANEL.png shows tabs while TRADE VIEW.png shows a
 * left sidebar. The two references disagree. Going with the sidebar — it
 * matches the vendor shell and scales to the six sub-sections the detail page
 * needs. Recorded as a decision, not discovered later.
 */

export const dynamic = "force-dynamic";

export default async function TradeHubPage({
  searchParams,
}: {
  searchParams: Promise<{ want?: string; shop?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/trade");

  const supabase = await createClient();

  const [{ data: myCards }, { data: myTrades }, { data: catalog }, wanted] =
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
      sp.want
        ? supabase
            .from("listings")
            .select("id, price, cards(name, set_name), shops(name)")
            .eq("id", sp.want)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const available = (myCards ?? []).filter((c) => c.status === "available");
  const want = wanted?.data as
    | { id: string; price: number; cards: { name: string; set_name: string }; shops: { name: string } }
    | null;

  return (
    <AppShell user={shellUser(user)}>
      <div className="flex flex-col gap-6 lg:flex-row">
        <TradeSidebar />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <header>
            <h1 className="text-display font-bold">Trade Pokémon Cards</h1>
            <p className="mt-1 text-body text-text-secondary">
              Find collectors who have the cards you want and want the cards you have.
            </p>
          </header>

          {/* ---- My Trade Cards ---- */}
          <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-h2 font-semibold">My Trade Cards</h2>
              <span className="rounded-full bg-primary-subtle px-2.5 py-0.5 text-caption font-medium text-primary tabular">
                {myCards?.length ?? 0} cards
              </span>
            </div>
            <p className="mt-1 text-body text-text-secondary">
              Cards you&apos;ve added and are available for trading.
            </p>

            {(myCards?.length ?? 0) === 0 ? (
              <p className="mt-4 text-body text-text-secondary">
                No cards yet — add one below to start building a trade.
              </p>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {myCards!.map((c) => (
                  <li key={c.id} className="rounded-lg border border-border p-3">
                    <p className="truncate text-body font-medium">{c.cards.name}</p>
                    <p className="truncate text-caption text-text-secondary">{c.cards.set_name}</p>
                    <p className="mt-1 text-body font-bold tabular">{php(Number(c.estimated_value ?? 0))}</p>
                    {c.status !== "available" ? (
                      <StatusPill tone={c.status === "traded" ? "success" : "attention"} className="mt-2">
                        {c.status.replace("_", " ")}
                      </StatusPill>
                    ) : (
                      <form action={removeTradeCard} className="mt-2">
                        <input type="hidden" name="id" value={c.id} />
                        <button className="h-11 w-full rounded-md border border-border text-caption font-medium text-text-secondary">
                          Remove
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <form action={addTradeCard} className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4">
              <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
                <label htmlFor="cardId" className="text-caption font-medium">Add a card you own</label>
                <select id="cardId" name="cardId" required className="h-11 rounded-md border border-border bg-bg px-3 text-body">
                  {(catalog ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.set_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex w-28 flex-col gap-1.5">
                <label htmlFor="condition" className="text-caption font-medium">Condition</label>
                <input id="condition" name="condition" defaultValue="NM" className="h-11 rounded-md border border-border px-3 text-body" />
              </div>
              <div className="flex w-32 flex-col gap-1.5">
                <label htmlFor="value" className="text-caption font-medium">Est. value ₱</label>
                <input id="value" name="value" type="number" min="0" defaultValue="1500" className="h-11 rounded-md border border-border px-3 text-body tabular" />
              </div>
              <button className="h-11 rounded-md bg-primary px-4 text-body font-medium text-white active:scale-[0.98]">
                Add card
              </button>
            </form>
          </section>

          {/* ---- Build Your Trade ---- */}
          <section className="rounded-lg border border-border bg-bg p-(--card-pad)">
            <h2 className="text-h2 font-semibold">Build Your Trade</h2>
            {!want ? (
              <p className="mt-2 text-body text-text-secondary">
                Open a card from{" "}
                <Link href="/" className="text-primary underline">browse</Link>{" "}
                and choose <span className="font-medium">Trade for This Card</span> to start.
              </p>
            ) : available.length === 0 ? (
              <p className="mt-2 text-body text-text-secondary">
                Add at least one available card above before proposing a trade.
              </p>
            ) : (
              <form action={proposeTrade} className="mt-4 grid gap-4 lg:grid-cols-2">
                <input type="hidden" name="wanted" value={want.id} />

                <div className="rounded-lg border border-border p-3">
                  <h3 className="text-h3 font-semibold text-primary">You Offer</h3>
                  <ul className="mt-2 flex flex-col">
                    {available.map((c) => (
                      <li key={c.id}>
                        <label className="flex h-11 items-center gap-2">
                          <input type="checkbox" name="offered" value={c.id} className="size-4 accent-[var(--color-primary)]" />
                          <span className="flex-1 truncate text-body">{c.cards.name}</span>
                          <span className="text-body tabular">{php(Number(c.estimated_value ?? 0))}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-border p-3">
                  <h3 className="text-h3 font-semibold">You Want</h3>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-body font-medium">{want.cards.name}</p>
                      <p className="truncate text-caption text-text-secondary">
                        {want.cards.set_name} · {want.shops.name}
                      </p>
                    </div>
                    <span className="text-body font-bold tabular">{php(want.price)}</span>
                  </div>
                </div>

                <button className="h-11 rounded-md bg-primary text-body font-medium text-white active:scale-[0.98] lg:col-span-2">
                  Submit Trade Proposal
                </button>
              </form>
            )}
          </section>

          {/* ---- My Trades ---- */}
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
        </div>
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

function TradeSidebar() {
  const items = [
    { href: "/trade", label: "Overview" },
    { href: "/vendor/trade-requests", label: "Trade Requests" },
  ];
  return (
    <aside className="lg:w-[220px] lg:shrink-0">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className="flex h-11 items-center whitespace-nowrap rounded-md px-3 text-body font-medium text-text-secondary hover:bg-bg-muted hover:text-text-primary"
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
