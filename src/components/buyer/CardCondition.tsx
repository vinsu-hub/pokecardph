"use client";

import { useEffect, useState } from "react";
import { conditionLabel, type Listing } from "@/lib/supabase/types";
import { usePrefersReducedMotion } from "@/lib/use-is-client";

const BARS = [
  { key: "condition_centering", label: "Centering" },
  { key: "condition_corners", label: "Corners" },
  { key: "condition_edges", label: "Edges" },
  { key: "condition_surface", label: "Surface" },
] as const;

/**
 * Grade badge + 4 subgrade bars (0-10, animated fill on mount, staggered
 * 60ms) + Seller Notes. `listing.condition_*` are additive columns
 * (0019_card_detail_condition_and_price_history.sql) that most existing
 * listings don't have yet — hides the bar row entirely rather than render
 * broken 0%-width bars when every value is null.
 */
export function CardCondition({ listing }: { listing: Listing }) {
  const values = BARS.map((b) => ({ ...b, value: listing[b.key] })).filter((v) => v.value != null);
  const [mounted, setMounted] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (values.length === 0 && !listing.condition_notes) return null;

  return (
    <section className="mt-6 rounded-lg border border-border bg-bg p-(--card-pad)">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-h3 font-semibold">Card Condition</h2>
        <span className="rounded-md bg-grade-bg px-2.5 py-1 text-caption font-medium text-grade-text">
          {conditionLabel(listing)}
        </span>
      </div>

      {values.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {values.map((v, i) => (
            <div key={v.key}>
              <div className="flex items-center justify-between text-caption text-text-secondary">
                <span>{v.label}</span>
                <span className="tabular font-medium text-text-primary">{v.value}/10</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-(--duration-slow) ease-(--ease-out-soft)"
                  style={{
                    width: mounted || reducedMotion ? `${((v.value as number) / 10) * 100}%` : "0%",
                    transitionDelay: reducedMotion ? "0ms" : `${i * 60}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {listing.condition_notes && (
        <p className="mt-4 border-t border-border pt-4 text-body text-text-secondary">
          <span className="font-medium text-text-primary">Seller Notes: </span>
          {listing.condition_notes}
        </p>
      )}
    </section>
  );
}
