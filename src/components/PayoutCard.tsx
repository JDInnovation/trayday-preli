"use client";

import { addMonthExpense } from "@/lib/firestore";
import { auth } from "@/lib/firebase.client";
import { fmtMoney } from "@/lib/utils";
import { useState } from "react";

export default function PayoutCard({
  y, m, currency, monthPnL, daysLeft, monthsStats
}: {
  y: number; m: number; currency: string; monthPnL: number; daysLeft: number;
  monthsStats: { expenses: number; sessionsSoFar: number; daysElapsed: number; sessionRate: number; }
}) {
  const [add, setAdd] = useState("");

  const { expenses, sessionsSoFar, daysElapsed, sessionRate } = monthsStats;
  const base = monthPnL - expenses;
  const payoutRate = 0.35;
  const payoutNow = Math.max(0, base * payoutRate);

  const avgPerSession = sessionsSoFar > 0 ? (monthPnL / sessionsSoFar) : 0;
  const expectedRemainingSessions = Math.round((sessionRate || 0) * daysLeft);
  const projectedPnL = monthPnL + (avgPerSession * expectedRemainingSessions);
  const projectedBase = projectedPnL - expenses;
  const projectedPayout = Math.max(0, projectedBase * payoutRate);

  return (
    <div className="card">
      <h3 className="font-bold mb-2">Payout</h3>
      <div className="grid md:grid-cols-3 gap-3">
        <div className="kpi">
          <span className="title">PnL acumulado do mês</span>
          <span className={`value ${monthPnL>=0?"text-ok":"text-danger"}`}>{fmtMoney(monthPnL, currency)}</span>
          <span className="small">Sessões com trades: <b>{sessionsSoFar}</b> / {daysElapsed} (ritmo: {(sessionRate*100||0).toFixed(1)}%)</span>
        </div>
        <div className="kpi">
          <span className="title">Despesas de trading (mês)</span>
          <span className="value">{fmtMoney(expenses, currency)}</span>
          <div className="flex gap-2">
            <input className="input" placeholder="Adicionar despesa" value={add} onChange={e => setAdd(e.target.value)} />
            <button className="btn" onClick={async () => {
              const v = parseFloat(add || "");
              if (!isFinite(v)) { alert("Valor inválido"); return; }
              await addMonthExpense(auth.currentUser!.uid, y, m, v);
              setAdd("");
            }}>Adicionar</button>
          </div>
          <span className="small">Somatório mensal; usa valores positivos. Não pode ficar negativo.</span>
        </div>
        <div className="kpi">
          <span className="title">Payout disponível (35%)</span>
          <span className={`inline-block px-2 py-1 rounded-full border ${payoutNow>0?"text-green-600 bg-green-950 border-green-800":"text-slate-400 bg-slate-900 border-slate-700"}`}>
            {fmtMoney(payoutNow, currency)}
          </span>
          <span className="small">Base: PnL mês − despesas = <b>{fmtMoney(base, currency)}</b></span>
        </div>
      </div>

      <hr className="border-line my-3" />

      <div className="grid md:grid-cols-3 gap-3">
        <div className="kpi"><span className="title">Média por sessão</span><span className="value">{fmtMoney(avgPerSession, currency)}</span></div>
        <div className="kpi"><span className="title">Sessões restantes (estim.)</span><span className="value">{expectedRemainingSessions}</span><span className="small">Dias restantes: {daysLeft}</span></div>
        <div className="kpi"><span className="title">PnL projetado (fim do mês)</span><span className={`value ${projectedPnL>=0?"text-ok":"text-danger"}`}>{fmtMoney(projectedPnL, currency)}</span><span className="small">Payout projetado (35%): <b>{fmtMoney(projectedPayout, currency)}</b></span></div>
      </div>
    </div>
  );
}
