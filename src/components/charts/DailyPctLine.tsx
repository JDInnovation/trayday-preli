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

type Point = { key: string; v: number };

export default function DailyPctLine({ data }: { data: Point[] }) {
  return (
    <div className="card">
      <h3 className="font-semibold mb-2">
        Percentagem acumulada por dia (desde início do mês)
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="key" />
            <YAxis
              tickFormatter={(x: number) => `${x}%`}
              domain={["auto", "auto"]}
            />
            <ReferenceLine y={0} strokeOpacity={0.5} />
            <Tooltip
              formatter={(v: number) => [`${v.toFixed(2)}%`, "Acumulado"]}
              labelFormatter={(label) => `Dia ${label}`}
            />
            <Line type="monotone" dataKey="v" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="small text-sub mt-2">
        Linha do % acumulado do mês (soma dos PnL até ao dia, dividido pelo saldo inicial × 100).
      </p>
    </div>
  );
}
