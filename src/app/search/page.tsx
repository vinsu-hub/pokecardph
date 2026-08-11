import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, shellUser } from "@/lib/auth";
import { AppShell } from "@/components/shared/AppShell";
import { FilterSheet } from "@/components/shared/FilterSheet";
import { ListingResults, ViewToggle } from "@/components/buyer/ListingResults";
import { getCartCount } from "@/lib/cart";
import { php } from "@/lib/utils";
import { conditionLabel, type ListingCard } from "@/lib/supabase/types";

/**
 * Search results.
 * Reference: REFERENCE IMAGES/SEARTCH RESULTS VIEW.png — and the only
 * reference that ships a mobile companion, so this is the one screen whose
 * mobile layout is judged rather than derived.
 *
 * Deliberately a DIFFERENT layout from Home/Browse: a left filter sidebar with
 * counts, active filter chips, and a grid/list toggle — not the horizontal
 * filter bar. Both screens exist in the references and they are not the same.
 */
export const dynamic = "force-dynamic";

type Search = {
  q?: string; set?: string; rarity?: string; grade?: string;
  min?: string; max?: string; sort?: string; view?: string;
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const view = sp.view === "list" ? "list" : "grid";
  const sort = sp.sort ?? "newest";

  const supabase = await createClient();
  const user = await getSessionUser();
  const cartCount = await getCartCount();

  // Facet counts come from the unfiltered result set for this query, so a
  // filter never hides the count that would bring it back.
  const base = supabase
    .from("listings")
    .select("*, cards!inner(*), shops(*)")
    .eq("status", "active")
    .eq("sale_type", "fixed");

  const { data: allData } = q
    ? await base.or(`name.ilike.%${q}%,set_name.ilike.%${q}%`, { referencedTable: "cards" })
    : await base;

  let rows = (allData ?? []) as unknown as ListingCard[];

  const facet = (pick: (l: ListingCard) => string | null) => {
    const m = new Map<string, number>();
    for (const l of rows) {
      const k = pick(l);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const sets = facet((l) => l.cards?.set_name ?? null);
  const rarities = facet((l) => l.cards?.rarity ?? null);
  const grades = facet((l) => (l.listing_type === "graded" ? conditionLabel(l) : "Non-Graded"));

  // Apply active filters.
  const active: { label: string; param: string }[] = [];
  if (sp.set) { rows = rows.filter((l) => l.cards?.set_name === sp.set); active.push({ label: sp.set, param: "set" }); }
  if (sp.rarity) { rows = rows.filter((l) => l.cards?.rarity === sp.rarity); active.push({ label: sp.rarity, param: "rarity" }); }
  if (sp.grade) {
    rows = rows.filter((l) => (l.listing_type === "graded" ? conditionLabel(l) : "Non-Graded") === sp.grade);
    active.push({ label: sp.grade, param: "grade" });
  }
  if (sp.min) { rows = rows.filter((l) => Number(l.price) >= Number(sp.min)); active.push({ label: `≥ ${php(Number(sp.min))}`, param: "min" }); }
  if (sp.max) { rows = rows.filter((l) => Number(l.price) <= Number(sp.max)); active.push({ label: `≤ ${php(Number(sp.max))}`, param: "max" }); }

  rows =
    sort === "price_asc" ? [...rows].sort((a, b) => Number(a.price) - Number(b.price))
    : sort === "price_desc" ? [...rows].sort((a, b) => Number(b.price) - Number(a.price))
    : rows;

  /** Build a URL preserving the other params. */
  const url = (patch: Partial<Search>) => {
    const next = new URLSearchParams();
    const merged = { ...sp, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, String(v));
    return `/search?${next.toString()}`;
  };

  const sidebar = (
    <div className="flex flex-col gap-4">
      <FacetGroup title="Set" items={sets} param="set" current={sp.set} url={url} />
      <FacetGroup title="Rarity" items={rarities} param="rarity" current={sp.rarity} url={url} />
      <FacetGroup title="Grade" items={grades} param="grade" current={sp.grade} url={url} />

      <section className="rounded-lg border border-border bg-bg p-4">
        <h3 className="text-h3 font-semibold">Price range</h3>
        <form action="/search" className="mt-3 flex items-center gap-2">
          {Object.entries(sp).map(([k, v]) =>
            k === "min" || k === "max" ? null : v ? <input key={k} type="hidden" name={k} value={String(v)} /> : null,
          )}
          <label htmlFor="min" className="sr-only">Minimum price</label>
          <input id="min" name="min" type="number" min="0" placeholder="₱ min" defaultValue={sp.min}
            className="h-11 w-full rounded-md border border-border px-2 text-body tabular" />
          <label htmlFor="max" className="sr-only">Maximum price</label>
          <input id="max" name="max" type="number" min="0" placeholder="₱ max" defaultValue={sp.max}
            className="h-11 w-full rounded-md border border-border px-2 text-body tabular" />
          <button className="h-11 min-w-11 shrink-0 rounded-md bg-primary px-3 text-caption font-medium text-white">Go</button>
        </form>
      </section>
    </div>
  );

  return (
    <AppShell user={shellUser(user)} cartCount={cartCount}>
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <FilterSheet activeCount={active.length}>{sidebar}</FilterSheet>

        <div className="min-w-0 flex-1">
          <header>
            <h1 className="text-display font-bold">
              {q ? <>Search results for &ldquo;{q}&rdquo;</> : "All listings"}
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              <span className="font-medium text-text-primary tabular">{rows.length}</span> result
              {rows.length === 1 ? "" : "s"} found
            </p>
          </header>

          {/* Active filter chips */}
          {active.length > 0 && (
            <ul className="mt-3 flex flex-wrap items-center gap-2">
              {active.map((a) => (
                <li key={a.param}>
                  <Link
                    href={url({ [a.param]: undefined } as Partial<Search>)}
                    className="flex h-11 items-center gap-1.5 rounded-full bg-primary-subtle px-3 text-caption font-medium text-primary"
                  >
                    {a.label}
                    <span aria-hidden>×</span>
                    <span className="sr-only">Remove filter</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link href={q ? `/search?q=${encodeURIComponent(q)}` : "/search"}
                  className="flex h-11 items-center px-2 text-caption font-medium text-text-secondary underline">
                  Clear all
                </Link>
              </li>
            </ul>
          )}

          {/* Sort + view toggle */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1">
              {[["newest", "Newest"], ["price_asc", "Price ↑"], ["price_desc", "Price ↓"]].map(([v, label]) => (
                <Link key={v} href={url({ sort: v })}
                  className={`flex h-11 items-center rounded-md px-3 text-body ${
                    sort === v ? "bg-primary-subtle font-medium text-primary-on-subtle" : "text-text-secondary hover:bg-bg-muted"
                  }`}>
                  {label}
                </Link>
              ))}
            </div>
            <ViewToggle view={view} url={(v) => url({ view: v })} />
          </div>

          <ListingResults
            listings={rows}
            view={view}
            empty={`Nothing matched${q ? ` “${q}”` : ""}. Try removing a filter.`}
          />
        </div>
      </div>
    </AppShell>
  );
}

function FacetGroup({
  title, items, param, current, url,
}: {
  title: string;
  items: [string, number][];
  param: string;
  current?: string;
  url: (p: Partial<Search>) => string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-lg border border-border bg-bg p-4">
      <h3 className="text-h3 font-semibold">{title}</h3>
      <ul className="mt-2 flex flex-col">
        {items.slice(0, 6).map(([value, count]) => {
          const on = current === value;
          return (
            <li key={value}>
              <Link
                href={url({ [param]: on ? undefined : value } as Partial<Search>)}
                aria-pressed={on}
                className={`flex h-11 items-center justify-between gap-2 rounded-md px-2 text-body ${
                  on ? "bg-primary-subtle font-medium text-primary-on-subtle" : "hover:bg-bg-muted"
                }`}
              >
                <span className="min-w-0 truncate">{value}</span>
                <span className="shrink-0 text-caption text-text-secondary tabular">{count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

