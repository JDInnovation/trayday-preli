"use client";

import { useEffect, useId, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export type DayPoint = { idx: string; v: number };

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

export default function DayPnlSparkline({
  data,
  currency = "EUR",
}: {
  data: DayPoint[];
  currency?: string;
}) {
  const id = useId().replace(/:/g, "");
  const theme = useTheme();

  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.brand} stopOpacity={0.55} />
              <stop offset="100%" stopColor={theme.brand} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="idx"
            tick={{ fill: theme.sub, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: theme.sub, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(x: number) =>
              x.toLocaleString(undefined, { style: "currency", currency })
            }
            domain={["auto", "auto"]}
            width={0}
          />
          <ReferenceLine y={0} stroke={theme.border} />
          <Tooltip
            formatter={(v: number) => [
              v.toLocaleString(undefined, { style: "currency", currency }),
              "Acumulado",
            ]}
            labelFormatter={(label: string | number) => `#${label}`}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke={theme.brand}
            fill={`url(#grad-${id})`}
            strokeWidth={2}
            dot={false}
            animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
