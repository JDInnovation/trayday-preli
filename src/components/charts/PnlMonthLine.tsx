"use client";

import { useEffect, useId, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";

export default function PnlMonthLine({
  data,
  currency = "EUR",
}: {
  data: { t: number; v: number }[];
  currency?: string;
}) {
  const id = useId().replace(/:/g, "");
  const [theme, setTheme] = useState({
    brand: "#7c5cff",
    text: "#e6eaf2",
    sub: "#9aa4b2",
    border: "rgba(255,255,255,0.12)",
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cs = getComputedStyle(document.documentElement);
    const get = (v: string, f: string) => (cs.getPropertyValue(v).trim() || f);
    setTheme({
      brand: get("--brand", "#7c5cff"),
      text: get("--text", "#e6eaf2"),
      sub: get("--text-sub", "#9aa4b2"),
      border: get("--border", "rgba(255,255,255,0.12)"),
    });
  }, []);

  const fmtX = (ts: number) =>
    new Date(ts).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });

  return (
    <div className="card h-72">
      <h4 className="mb-2 font-semibold">PnL Line </h4>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <defs>
            <linearGradient id={`stroke-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.brand} stopOpacity={1} />
              <stop offset="100%" stopColor={theme.brand} stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={theme.border} strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey="t"
            tickFormatter={fmtX}
            tick={{ fill: theme.sub, fontSize: 12 }}
            axisLine={{ stroke: theme.border }}
            tickLine={{ stroke: theme.border }}
          />
          <YAxis
            tick={{ fill: theme.sub, fontSize: 12 }}
            axisLine={{ stroke: theme.border }}
            tickLine={{ stroke: theme.border }}
            tickFormatter={(v: number) =>
              v.toLocaleString(undefined, { style: "currency", currency })
            }
          />
          <Tooltip
            formatter={(v: number) =>
              v.toLocaleString(undefined, { style: "currency", currency })
            }
            labelFormatter={(l: string | number) => fmtX(Number(l))}
          />
          <ReferenceLine y={0} stroke={theme.border} />
          <Line
            type="monotone"
            dataKey="v"
            stroke={`url(#stroke-${id})`}
            strokeWidth={2.5}
            dot={false}
            animationDuration={650}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
