"use client";

import { fmtMoney } from "@/lib/utils";

export default function MonthSummary(props: {
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
}) {
  const { monthLabel: ml, currency, monthPnL, monthPct, monthWinRate, totalTrades, best, worst, avgPerTrade, daysLeft } = props;
  return (
    <div className="card">
      <h3 className="font-bold mb-2">Resumo do mês — {ml}</h3>
      <div className="grid md:grid-cols-4 gap-3">
        <div className="kpi"><span className="title">PnL do mês</span><span className={`value ${monthPnL>=0?"text-ok":"text-danger"}`}>{fmtMoney(monthPnL, currency)}</span></div>
        <div className="kpi"><span className="title">% vs início (mês)</span><span className={`value ${monthPct>=0?"text-ok":"text-danger"}`}>{monthPct.toFixed(2)}%</span></div>
        <div className="kpi"><span className="title">Win rate (mês)</span><span className="value">{monthWinRate.toFixed(2)}%</span></div>
        <div className="kpi"><span className="title">Trades no mês</span><span className="value">{totalTrades}</span></div>
        <div className="kpi"><span className="title">Melhor dia</span><span className="value">{best || "—"}</span></div>
        <div className="kpi"><span className="title">Pior dia</span><span className="value">{worst || "—"}</span></div>
        <div className="kpi"><span className="title">Média por trade</span><span className="value">{fmtMoney(avgPerTrade, currency)}</span></div>
        <div className="kpi"><span className="title">Dias até fechar o mês</span><span className="value">{daysLeft > 0 ? daysLeft : "—"}</span></div>
      </div>
    </div>
  );
}
