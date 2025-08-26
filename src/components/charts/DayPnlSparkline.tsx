"use client";

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

export type DayPoint = { idx: string; v: number };

export default function DayPnlSparkline({
  data,
  currency = "EUR",
}: {
  data: DayPoint[];
  currency?: string;
}) {
  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="idx" />
          <YAxis
            tickFormatter={(x: number) =>
              x.toLocaleString(undefined, { style: "currency", currency })
            }
            domain={["auto", "auto"]}
          />
          <ReferenceLine y={0} strokeOpacity={0.5} />
          <Tooltip
            formatter={(v: number) => [
              v.toLocaleString(undefined, { style: "currency", currency }),
              "Acumulado",
            ]}
            labelFormatter={(label: string | number) => `#${label}`}
          />
          <Line type="monotone" dataKey="v" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
