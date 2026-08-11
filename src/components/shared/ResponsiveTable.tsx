import { cn } from "@/lib/utils";

/**
 * Tables (orders, listings, invoices) render as a real table at >= 1024px and
 * as stacked cards below it.
 *
 * Explicitly NOT a horizontally-scrolling table — that is the lazy answer and
 * it makes a 7-column order table unusable on a phone, which is the primary
 * surface for this market.
 *
 * Row height 56px, hover --color-bg-muted, no vertical cell borders, one
 * horizontal divider between rows. All locked by the design system.
 */

export type Column<T> = {
  key: string;
  header: string;
  /** Desktop cell. */
  cell: (row: T) => React.ReactNode;
  /**
   * Where this column goes in the mobile card. `title` and `meta` render in
   * the card header; `hidden` drops it on mobile entirely (use for anything
   * that only makes sense beside other columns). Default is a labelled row.
   */
  mobile?: "title" | "meta" | "hidden";
  className?: string;
};

export function ResponsiveTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty = "Nothing here yet.",
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg px-6 py-12 text-center text-body text-text-secondary">
        {empty}
      </div>
    );
  }

  const title = columns.find((c) => c.mobile === "title");
  const meta = columns.filter((c) => c.mobile === "meta");
  const body = columns.filter((c) => !c.mobile || c.mobile === undefined);

  return (
    <>
      {/* ---- Desktop ---- */}
      <div className="hidden overflow-hidden rounded-lg border border-border bg-bg lg:block">
        <table className="w-full border-collapse text-body">
          <thead>
            <tr className="border-b border-border text-left">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "px-4 py-3 text-caption font-medium text-text-secondary uppercase",
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "h-14 border-b border-border last:border-0 transition-colors duration-(--duration-instant)",
                  onRowClick && "cursor-pointer hover:bg-bg-muted",
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4", c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Mobile: stacked cards ---- */}
      <ul className="flex flex-col gap-3 lg:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)}>
            <button
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              disabled={!onRowClick}
              className={cn(
                "w-full rounded-lg border border-border bg-bg p-4 text-left shadow-rest transition-transform duration-(--duration-instant)",
                onRowClick && "active:scale-[0.99]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {title && (
                    <div className="text-body font-medium">
                      {title.cell(row)}
                    </div>
                  )}
                </div>
                {meta.map((c) => (
                  <div key={c.key} className="shrink-0">
                    {c.cell(row)}
                  </div>
                ))}
              </div>
              {body.length > 0 && (
                <dl className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
                  {body.map((c) => (
                    <div
                      key={c.key}
                      className="flex items-center justify-between gap-4"
                    >
                      <dt className="text-caption text-text-secondary">
                        {c.header}
                      </dt>
                      <dd className="text-body">{c.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
