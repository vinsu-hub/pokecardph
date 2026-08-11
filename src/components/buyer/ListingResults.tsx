import Link from "next/link";
import { ListingCardTile } from "./ListingCardTile";
import { php } from "@/lib/utils";
import { conditionLabel, type ListingCard } from "@/lib/supabase/types";

/**
 * Grid / list renderer shared by Home/Browse and Search.
 *
 * Both reference screens show the same toggle and the same two treatments, so
 * they get one implementation. The list row is the layout the search comp's
 * mobile companion uses — thumbnail left, details right, price trailing.
 */
export function ListingResults({
  listings,
  view,
  empty = "Nothing matched. Try removing a filter.",
}: {
  listings: ListingCard[];
  view: "grid" | "list";
  empty?: React.ReactNode;
}) {
  if (listings.length === 0) {
    return (
      <p className="mt-4 rounded-lg border border-border bg-bg px-6 py-12 text-center text-body text-text-secondary">
        {empty}
      </p>
    );
  }

  if (view === "list") {
    return (
      <ul className="mt-4 flex flex-col gap-3">
        {listings.map((l) => (
          <li key={l.id}>
            <Link
              href={`/card/${l.id}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-bg p-3 transition-colors duration-(--duration-instant) hover:bg-bg-muted"
            >
              <span className="relative size-16 shrink-0 overflow-hidden rounded-md bg-bg-muted">
                <Art name={l.cards.name} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-medium">{l.cards.name}</span>
                <span className="block truncate text-caption text-text-secondary">
                  {l.cards.set_name} · {conditionLabel(l)}
                </span>
                <span className="block truncate text-caption text-text-secondary">
                  {l.shops.name}
                </span>
              </span>
              <span className="shrink-0 text-body font-bold tabular">{php(Number(l.price))}</span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {listings.map((l) => (
        <li key={l.id}>
          <ListingCardTile listing={l} />
        </li>
      ))}
    </ul>
  );
}

/** Grid / list segmented control. */
export function ViewToggle({
  view,
  url,
}: {
  view: "grid" | "list";
  url: (v: string) => string;
}) {
  return (
    <div className="flex gap-1" role="group" aria-label="View mode">
      {(["grid", "list"] as const).map((v) => (
        <Link
          key={v}
          href={url(v)}
          aria-pressed={view === v}
          className={`flex h-11 min-w-11 items-center justify-center rounded-md border px-3 text-caption font-medium capitalize ${
            view === v
              ? "border-primary bg-primary-subtle text-primary"
              : "border-border text-text-secondary hover:bg-bg-muted"
          }`}
        >
          {v}
        </Link>
      ))}
    </div>
  );
}

/**
 * A labelled `<select>` that submits its form on change.
 * The reference's filter bar is a row of dropdowns; this is the one shape they
 * all use, so the bar stays consistent as filters are added.
 */
export function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: [string, string][];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="sr-only">{label}</label>
      <select
        id={name}
        name={name}
        defaultValue={value ?? ""}
        className="h-11 rounded-md border border-border bg-bg px-3 text-body text-text-primary"
      >
        <option value="">{label}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </div>
  );
}

function Art({ name }: { name: string }) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return (
    <span
      className="absolute inset-0"
      style={{ background: `linear-gradient(150deg, hsl(${h} 70% 88%), hsl(${(h + 40) % 360} 65% 78%))` }}
    />
  );
}
