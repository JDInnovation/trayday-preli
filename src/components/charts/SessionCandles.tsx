"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";

export default function SessionCandles({
  data,
  currency = "EUR",
}: {
  data: { key: string; pnl: number }[];
  currency?: string;
}) {
  const id = useId().replace(/:/g, "");
  const [theme, setTheme] = useState({
    ok: "#20c997",
    danger: "#ff6b6b",
    sub: "#9aa4b2",
    border: "rgba(255,255,255,0.12)",
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cs = getComputedStyle(document.documentElement);
    const get = (v: string, f: string) => (cs.getPropertyValue(v).trim() || f);
    setTheme({
      ok: get("--ok", "#20c997"),
      danger: get("--danger", "#ff6b6b"),
      sub: get("--text-sub", "#9aa4b2"),
      border: get("--border", "rgba(255,255,255,0.12)"),
    });
  }, []);

  const rows = useMemo(
    () =>
      data.map((d) => ({
        key: d.key,
        pos: d.pnl > 0 ? d.pnl : 0,
        neg: d.pnl < 0 ? d.pnl : 0,
      })),
    [data]
  );

  return (
    <div className="card h-80">
      <h4 className="mb-2 font-semibold">PnL Candle</h4>
      <ResponsiveContainer width="100%" height="85%">
        <ComposedChart data={rows}>
          <defs>
            <linearGradient id={`ok-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.ok} stopOpacity={0.95} />
              <stop offset="100%" stopColor={theme.ok} stopOpacity={0.55} />
            </linearGradient>
            <linearGradient id={`ng-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.danger} stopOpacity={0.95} />
              <stop offset="100%" stopColor={theme.danger} stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={theme.border} strokeDasharray="3 3" opacity={0.25} />
          <XAxis
            dataKey="key"
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
            formatter={(v: number) => [
              v.toLocaleString(undefined, { style: "currency", currency }),
              "PnL",
            ]}
            labelFormatter={(l: string | number) => `#${l}`}
          />
          <ReferenceLine y={0} stroke={theme.border} />
          <Bar dataKey="pos" fill={`url(#ok-${id})`} radius={[6, 6, 0, 0]} />
          <Bar dataKey="neg" fill={`url(#ng-${id})`} radius={[0, 0, 6, 6]} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
