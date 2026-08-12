/**
 * Native <details>/<summary> accordion — free keyboard and screen-reader
 * support with no hand-rolled ARIA state. No accordion pattern existed
 * anywhere else in the app to derive this from; kept deliberately generic
 * (props only, no beta-specific copy) so it can be reused elsewhere.
 */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <dl className="flex flex-col divide-y divide-border rounded-lg border border-border bg-bg">
      {items.map((item) => (
        <details key={item.q} className="group p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-body font-medium marker:content-none">
            {item.q}
            <span
              aria-hidden
              className="shrink-0 text-text-secondary transition-transform duration-(--duration-fast) group-open:rotate-180"
            >
              ⌄
            </span>
          </summary>
          <dd className="mt-2 text-body text-text-secondary">{item.a}</dd>
        </details>
      ))}
    </dl>
  );
}
