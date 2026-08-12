"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Market Price's history chart. A `Line`, not `SalesChart`'s `Area` — this is
 * a price series, not cumulative sales, so a filled area under it would imply
 * a total that isn't meaningful here. Styling values (tokens, tooltip shape,
 * ₱ formatter) are copied from `SalesChart.tsx` rather than shared through an
 * abstraction — two chart instances doesn't justify one.
 */
export function PriceHistoryChart({
  data,
  grade,
}: {
  data: { date: string; price: number }[];
  grade: string;
}) {
  return (
    <div className="mt-4">
      <p className="text-caption text-text-secondary">Price History ({grade})</p>
      <div className="mt-2 h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v: number) => (v >= 1000 ? `₱${Math.round(v / 1000)}k` : `₱${v}`)}
            />
            <Tooltip
              cursor={{ stroke: "var(--color-border)" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                fontSize: 12,
              }}
              formatter={(v) => [`₱${Number(v).toLocaleString("en-PH")}`, "Price"] as [string, string]}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="var(--color-primary)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-primary)" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
