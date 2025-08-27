"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  CartesianGrid,
} from "recharts";

type Item = {
  key: string; // índice/ordem da trade no mês
  pnl: number; // PnL da trade (fechada)
  open: number;
  close: number;
  high: number;
  low: number;
  date?: number;
};

export default function TradeCandles({
  data,
  currency = "EUR",
}: {
  data: Item[];
  currency?: string;
}) {
  const [theme, setTheme] = useState({
    ok: "#20c997",
    danger: "#ff6b6b",
    sub: "#9aa4b2",
    text: "#e6eaf2",
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
      text: get("--text", "#e6eaf2"),
      border: get("--border", "rgba(255,255,255,0.12)"),
    });
  }, []);

  return (
    <div className="card">
      <h3 className="font-semibold mb-2">PnL Trades</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke={theme.border} strokeDasharray="3 3" opacity={0.2} />
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
            <ReferenceLine y={0} stroke={theme.border} strokeOpacity={0.6} />
            <Tooltip
              formatter={(v: any, n: any, p: any) => {
                if (n === "pnl") {
                  return [
                    (v as number).toLocaleString(undefined, {
                      style: "currency",
                      currency,
                    }),
                    "PnL",
                  ];
                }
                return [v, n];
              }}
              labelFormatter={(label: string | number, payload: any[]) => {
                if (!payload?.[0]) return String(label);
                const it = payload[0].payload as Item;
                const fmt = (x: number) =>
                  x.toLocaleString(undefined, { style: "currency", currency });
                const d = it.date
                  ? new Date(it.date).toLocaleDateString()
                  : "—";
                return `#${label} • ${d}\nopen: ${fmt(it.open)}  →  close: ${fmt(
                  it.close
                )}`;
              }}
            />
            <Bar dataKey="pnl" radius={[6, 6, 6, 6]} animationDuration={600}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.pnl >= 0 ? theme.ok : theme.danger} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="small text-sub mt-2">
        Cada barra representa o PnL de uma trade fechada do mês.
      </p>
    </div>
  );
}
