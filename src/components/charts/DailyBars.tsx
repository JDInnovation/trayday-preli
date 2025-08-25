"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export default function DailyBars({ data }: { data: { key: string; pnl: number }[] }) {
  return (
    <div className="card h-80">
      <h4 className="mb-2 font-semibold">PnL diário (barras)</h4>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data}>
          <XAxis dataKey="key" />
          <YAxis />
          <Tooltip />
          <ReferenceLine y={0} stroke="#1f2937" />
          <Bar dataKey="pnl" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
