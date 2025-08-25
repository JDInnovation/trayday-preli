"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export default function PnlMonthLine({ data }: { data: { t: number; v: number }[] }) {
  const fmtX = (ts: number) => new Date(ts).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
  return (
    <div className="card h-72">
      <h4 className="mb-2 font-semibold">Saldo acumulado (PnL) — mês visível</h4>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <XAxis dataKey="t" tickFormatter={fmtX} />
          <YAxis />
          <Tooltip formatter={(v: number) => v.toFixed(2)} labelFormatter={fmtX} />
          <ReferenceLine y={0} stroke="#1f2937" />
          <Line type="monotone" dataKey="v" stroke="#60a5fa" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
