"use client";

import { fmtMoney } from "@/lib/utils";

type Props = {
  monthLabel: string;
  currency: string;
  monthPnL: number;
  monthPct: number;
  monthWinRate: number;
  totalTrades: number;
  best?: string;
  worst?: string;
  avgPerTrade: number;
  daysLeft: number;
};

export default function MonthSummary({
  monthLabel: ml,
  currency,
  monthPnL,
  monthPct,
  monthWinRate,
  totalTrades,
  best,
  worst,
  avgPerTrade,
  daysLeft,
}: Props) {
  return (
    <div className="card">
      <h3 className="font-bold mb-2">Resumo do mês — {ml}</h3>

      {/* 2 colunas em ecrãs pequenos; 4 em md+ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          label="PnL do mês"
          value={fmtMoney(monthPnL, currency)}
          tone={monthPnL >= 0 ? "pos" : "neg"}
        />
        <Kpi
          label="% vs início (mês)"
          value={`${monthPct.toFixed(2)}%`}
          tone={monthPct >= 0 ? "pos" : "neg"}
        />
        <Kpi label="Win rate (mês)" value={`${monthWinRate.toFixed(2)}%`} />
        <Kpi label="Trades no mês" value={`${totalTrades}`} />
        <Kpi label="Melhor dia" value={best || "—"} />
        <Kpi label="Pior dia" value={worst || "—"} />
        <Kpi label="Média por trade" value={fmtMoney(avgPerTrade, currency)} />
        <Kpi
          label="Dias até fechar o mês"
          value={daysLeft > 0 ? String(daysLeft) : "—"}
        />
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
}) {
  const color =
    tone === "pos" ? "text-ok" : tone === "neg" ? "text-danger" : "text-slate-200";

  return (
    <div className="rounded-xl border border-line bg-slate-900/40 p-2 md:p-3 min-w-0 text-center">
      <div className="text-sub text-[11px] md:text-xs leading-tight truncate">
        {label}
      </div>
      <div
        className={`font-semibold ${color} text-sm md:text-base leading-tight whitespace-nowrap truncate`}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}
