"use client";

import { useMemo } from "react";
import { Trade } from "@/lib/types";
import { ymd, fmtMoney } from "@/lib/utils";

export default function RiskProgress({
  trades,
  balance,
  currency,
}: {
  trades: Trade[];
  balance: number;
  currency: string;
}) {
  const todayKey = ymd(new Date());

  const pnlToday = useMemo(() => {
    return trades
      .filter(
        (t) =>
          t.status === "closed" &&
          t.closedAt &&
          ymd(new Date(t.closedAt)) === todayKey
      )
      .reduce((a, t) => a + (t.pnl || 0), 0);
  }, [trades, todayKey]);

  const maxDayLoss = Math.max(0, 0.09 * (balance || 0));
  const dayGoal = Math.max(0, 0.15 * (balance || 0));

  const usedLoss = Math.min(Math.max(-pnlToday, 0), maxDayLoss);
  const lossPct = maxDayLoss > 0 ? (usedLoss / maxDayLoss) * 100 : 0;

  const goalHit = Math.min(Math.max(pnlToday, 0), dayGoal);
  const goalPct = dayGoal > 0 ? (goalHit / dayGoal) * 100 : 0;

  return (
    <div className="card h-full">
      <h4 className="font-semibold mb-2">Risco & Meta (hoje)</h4>

      {/* Perda diária */}
      <div className="mb-2">
        <div className="flex items-baseline justify-between">
          <span className="small text-sub">Perda diária (limite 9%)</span>
          <span className="small">
            {fmtMoney(usedLoss, currency)} / {fmtMoney(maxDayLoss, currency)}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-1">
          <div
            className={`h-full ${lossPct >= 90 ? "bg-red-600" : "bg-red-500/70"}`}
            style={{ width: `${Math.min(100, lossPct)}%` }}
          />
        </div>
      </div>

      {/* Meta diária */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="small text-sub">Meta diária (15%)</span>
          <span className="small">
            {fmtMoney(goalHit, currency)} / {fmtMoney(dayGoal, currency)}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-1">
          <div
            className="h-full bg-emerald-500/80"
            style={{ width: `${Math.min(100, goalPct)}%` }}
          />
        </div>
      </div>

      <div className="small text-sub mt-2">
        Baseado no saldo atual. Atualiza em tempo real com as trades fechadas hoje.
      </div>
    </div>
  );
}
