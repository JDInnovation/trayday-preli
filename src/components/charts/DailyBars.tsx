"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";

type Row = { key: string; pnl: number };

function useTheme() {
  const [c, setC] = useState({
    brand: "#7c5cff",
    ok: "#20c997",
    danger: "#ff6b6b",
    text: "#e6eaf2",
    sub: "#9aa4b2",
    border: "rgba(255,255,255,0.12)",
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cs = getComputedStyle(document.documentElement);
    const get = (v: string, f: string) => (cs.getPropertyValue(v).trim() || f);
    setC({
      brand: get("--brand", c.brand),
      ok: get("--ok", c.ok),
      danger: get("--danger", c.danger),
      text: get("--text", c.text),
      sub: get("--text-sub", c.sub),
      border: get("--border", c.border),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return c;
}

export default function DailyBars({
  data,
  currency = "EUR",
}: {
  data: Row[];
  currency?: string;
}) {
  const id = useId().replace(/:/g, "");
  const theme = useTheme();

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
      <h4 className="mb-2 font-semibold">PnL Daily (barras)</h4>

      <div className="h-[85%]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <defs>
              <linearGradient id={`g-pos-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.ok} stopOpacity={0.95} />
                <stop offset="100%" stopColor={theme.ok} stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id={`g-neg-${id}`} x1="0" y1="0" x2="0" y2="1">
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
            />
            <ReferenceLine y={0} stroke={theme.border} />

            <Tooltip
              cursor={{ opacity: 0.08 }}
              formatter={(v: number) => [
                v.toLocaleString(undefined, { style: "currency", currency }),
                "PnL",
              ]}
              labelFormatter={(label: string | number) => `Dia ${label}`}
            />

            {/* barras split para cores positivas/negativas */}
            <Bar
              dataKey="pos"
              fill={`url(#g-pos-${id})`}
              radius={[6, 6, 0, 0]}
              animationDuration={600}
            />
            <Bar
              dataKey="neg"
              fill={`url(#g-neg-${id})`}
              radius={[0, 0, 6, 6]}
              animationDuration={600}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
