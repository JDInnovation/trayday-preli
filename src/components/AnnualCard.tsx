"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { fmtMoney, monthLabel } from "@/lib/utils";

export default function AnnualCard({
  y, months, currency, onBack, onPrevYear, onNextYear, onPickYear
}: {
  y: number;
  months: { m: number; pnl: number; trades: number; winRate: number }[];
  currency: string;
  onBack: () => void; onPrevYear: () => void; onNextYear: () => void; onPickYear: (y: number) => void;
}) {
  const data = months.map(m => ({ label: monthLabel(y, m.m), pnl: m.pnl }));
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={onPrevYear}>«</button>
          <input className="input w-[120px]" type="number" value={y} onChange={e => onPickYear(parseInt(e.target.value || String(y), 10))} />
          <button className="btn-ghost" onClick={onNextYear}>»</button>
        </div>
        <button className="btn" onClick={onBack}>Voltar ao mês</button>
      </div>

      <h3 className="font-bold mb-2">Performance anual — {y}</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip formatter={(v: number) => fmtMoney(v, currency)} />
            <ReferenceLine y={0} stroke="#1f2937" />
            <Bar dataKey="pnl" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
