"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

type ShopSearch = {
  tab?: string; cat?: string; set?: string; rarity?: string;
  q?: string; sort?: string; view?: string;
};

/**
 * One facet group (Set or Rarity) in the shop storefront's filter sidebar.
 * Real data in, real navigation out — `items` are the actual Supabase-derived
 * counts computed in shops/[shopId]/page.tsx, and selecting a value still
 * navigates via a real <Link> href, same URL-driven convention as the rest
 * of this codebase's filters. Only *which items are currently listed*
 * (search-filtered, top-5-vs-all) is local client UI state — ported from the
 * "Collector's Gallery" reference's FilterBlock (search-within-sets,
 * "Show more"), which our previous plain top-5 truncation didn't have.
 */
export function ShopFacetList({
  title,
  items,
  param,
  selected,
  shopId,
  currentParams,
  searchable = false,
}: {
  title: string;
  items: [string, number][];
  param: "set" | "rarity";
  selected: string[];
  shopId: string;
  currentParams: ShopSearch;
  searchable?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  const buildUrl = (patch: Partial<ShopSearch>) => {
    const next = new URLSearchParams();
    const merged = { ...currentParams, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, String(v));
    const s = next.toString();
    return `/shops/${shopId}${s ? `?${s}` : ""}`;
  };

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    return buildUrl({ [param]: next.length ? next.join(",") : undefined } as Partial<ShopSearch>);
  };

  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter(([value]) => value.toLowerCase().includes(q)) : items;
  const visible = expanded ? filtered : filtered.slice(0, 5);

  return (
    <div className="mt-3">
      <h3 className="text-caption font-medium text-text-secondary">{title}</h3>

      {searchable && (
        <div className="mt-1.5 flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5">
          <Search className="size-3.5 shrink-0 text-text-secondary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}…`}
            className="min-w-0 flex-1 border-0 bg-transparent text-caption text-text-primary outline-none placeholder:text-text-secondary"
          />
        </div>
      )}

      <ul className="mt-1 flex flex-col">
        {visible.map(([value, count]) => {
          const on = selected.includes(value);
          return (
            <li key={value}>
              <Link
                href={toggle(value)}
                aria-pressed={on}
                className={`flex h-11 items-center gap-2 rounded-md px-2 text-body ${
                  on ? "bg-primary-subtle font-medium text-primary-on-subtle" : "hover:bg-bg-muted"
                }`}
              >
                <span
                  aria-hidden
                  className={`grid size-4 shrink-0 place-items-center rounded border ${
                    on ? "border-primary bg-primary text-white" : "border-border"
                  }`}
                >
                  {on && "✓"}
                </span>
                <span className="min-w-0 flex-1 truncate text-left">{value}</span>
                <span className="shrink-0 text-caption text-text-secondary tabular">{count}</span>
              </Link>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="px-2 py-2 text-caption text-text-secondary">No matches.</li>
        )}
      </ul>

      {!expanded && filtered.length > 5 && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-1 text-caption font-medium text-primary hover:underline"
        >
          Show more
        </button>
      )}
    </div>
  );
}
