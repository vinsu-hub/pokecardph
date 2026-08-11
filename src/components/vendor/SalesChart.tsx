"use client";

import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

/**
 * Sales Overview — 30-day area chart.
 *
 * Colours come from the design tokens rather than recharts defaults, so the
 * chart belongs to the same system as everything else. Tooltip and axes are
 * present because a chart without them relies on colour alone to convey
 * meaning, which the UX rules forbid.
 */
export function SalesChart({
  data,
}: {
  data: { date: string; total: number }[];
}) {
  return (
    <div className="mt-4 h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
            tickLine={false}
            axisLine={false}
            interval={6}
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
            formatter={(v) => [`₱${Number(v).toLocaleString("en-PH")}`, "Sales"] as [string, string]}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#salesFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
