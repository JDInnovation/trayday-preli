"use client";

import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// Representamos candles simplificados: barra de PnL por sessão
export default function SessionCandles({ data }: { data: { key: string; pnl: number }[] }) {
  return (
    <div className="card h-80">
      <h4 className="mb-2 font-semibold">PnL por sessão (mês)</h4>
      <ResponsiveContainer width="100%" height="85%">
        <ComposedChart data={data}>
          <XAxis dataKey="key" />
          <YAxis />
          <Tooltip />
          <ReferenceLine y={0} stroke="#1f2937" />
          <Bar dataKey="pnl" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
