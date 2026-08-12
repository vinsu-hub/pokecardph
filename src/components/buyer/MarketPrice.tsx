import { createClient } from "@/lib/supabase/server";
import { conditionLabel, type Card, type Listing } from "@/lib/supabase/types";
import { php, cn } from "@/lib/utils";
import { PriceHistoryChart } from "./PriceHistoryChart";

/**
 * 4 grade stat blocks (current grade highlighted) + a price-history chart for
 * the highlighted grade. Reads `price_history`
 * (0019_card_detail_condition_and_price_history.sql) — a table that doesn't
 * exist on every environment yet, so a query error is treated the same as
 * "no data" and the whole section hides, matching the null-data guard every
 * other new Card Detail section follows.
 */
export async function MarketPrice({ card, listing }: { card: Card; listing: Listing }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("price_history")
    .select("grade, price, recorded_at")
    .eq("card_id", card.id)
    .order("recorded_at", { ascending: true });

  if (error || !data || data.length === 0) return null;

  const byGrade = new Map<string, { recorded_at: string; price: number }[]>();
  for (const row of data as { grade: string; price: number; recorded_at: string }[]) {
    const list = byGrade.get(row.grade) ?? [];
    list.push({ recorded_at: row.recorded_at, price: row.price });
    byGrade.set(row.grade, list);
  }

  // conditionLabel() says "Non-Graded" for the UI badge; price_history's seed
  // bucket for the same concept is "Ungraded" — reconcile here rather than
  // teach conditionLabel() a second vocabulary.
  const currentLabel = conditionLabel(listing);
  const currentGrade = currentLabel === "Non-Graded" ? "Ungraded" : currentLabel;

  const otherGrades = [...byGrade.keys()].filter((g) => g !== currentGrade);
  const ordered = [currentGrade, ...otherGrades].filter((g) => byGrade.has(g)).slice(0, 4);
  if (ordered.length === 0) return null;

  const stats = ordered.map((grade) => {
    const points = byGrade.get(grade)!;
    const latest = points[points.length - 1];
    const prev = points.length > 1 ? points[points.length - 2] : null;
    const change = prev && prev.price > 0 ? ((latest.price - prev.price) / prev.price) * 100 : null;
    return { grade, price: latest.price, change };
  });

  const chartGrade = ordered[0];
  const chartData = (byGrade.get(chartGrade) ?? []).map((p) => ({
    date: new Date(p.recorded_at).toLocaleDateString("en-PH", { month: "short" }),
    price: p.price,
  }));

  return (
    <section className="mt-6 rounded-lg border border-border bg-bg p-(--card-pad)">
      <h2 className="text-h3 font-semibold">Market Price</h2>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.grade}
            className={cn(
              "rounded-md border p-3",
              s.grade === chartGrade ? "border-primary bg-primary-subtle" : "border-border",
            )}
          >
            <p className="truncate text-caption text-text-secondary">{s.grade}</p>
            <p className="mt-1 text-body font-bold tabular">{php(s.price)}</p>
            {s.change !== null && (
              <p className={cn("text-caption tabular", s.change >= 0 ? "text-success" : "text-danger")}>
                {s.change >= 0 ? "↑" : "↓"} {Math.abs(s.change).toFixed(1)}%
              </p>
            )}
          </div>
        ))}
      </div>

      <PriceHistoryChart data={chartData} grade={chartGrade} />
    </section>
  );
}
