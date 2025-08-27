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

type Point = { key: string; v: number };

function useTheme() {
  const [c, setC] = useState({
    brand: "#7c5cff",
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
      text: get("--text", c.text),
      sub: get("--text-sub", c.sub),
      border: get("--border", c.border),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return c;
}

export default function DailyPctLine({ data }: { data: Point[] }) {
  const id = useId().replace(/:/g, "");
  const theme = useTheme();

  return (
    <div className="card">
      <h3 className="font-semibold mb-2">
        Acumulation
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <defs>
              <linearGradient id={`stroke-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.brand} stopOpacity={1} />
                <stop offset="100%" stopColor={theme.brand} stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={theme.border} strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="key"
              tick={{ fill: theme.sub, fontSize: 12 }}
              axisLine={{ stroke: theme.border }}
              tickLine={{ stroke: theme.border }}
            />
            <YAxis
              tickFormatter={(x: number) => `${x}%`}
              tick={{ fill: theme.sub, fontSize: 12 }}
              axisLine={{ stroke: theme.border }}
              tickLine={{ stroke: theme.border }}
              domain={["auto", "auto"]}
            />
            <ReferenceLine y={0} stroke={theme.border} strokeOpacity={0.6} />
            <Tooltip
              cursor={{ strokeOpacity: 0.25 }}
              formatter={(v: number) => [`${v.toFixed(2)}%`, "Acumulado"]}
              labelFormatter={(label: string | number) => `Dia ${label}`}
            />
            <Line
              type="monotone"
              dataKey="v"
              dot={false}
              stroke={`url(#stroke-${id})`}
              strokeWidth={2.5}
              animationDuration={620}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="small text-sub mt-2">
        Soma do PnL até ao dia / saldo inicial × 100.
      </p>
    </div>
  );
}
