"use client";

import { useState } from "react";
import { addMonthExpense } from "@/lib/firestore";
import { auth } from "@/lib/firebase.client";
import { fmtMoney } from "@/lib/utils";

type Stats = {
  expenses: number;
  sessionsSoFar: number;
  daysElapsed: number;
  sessionRate: number; // 0..1 (percentagem de dias com sessão)
};

export default function PayoutCard({
  y,
  m,
  currency,
  monthPnL,
  daysLeft,
  monthsStats,
}: {
  y: number;
  m: number;
  currency: string;
  monthPnL: number;
  daysLeft: number;
  monthsStats: Stats;
}) {
  const { expenses, sessionsSoFar, daysElapsed, sessionRate } = monthsStats;

  // Cálculos principais
  const payoutRate = 0.35;
  const base = monthPnL - expenses; // base para payout
  const payoutNow = Math.max(0, base * payoutRate);

  const avgPerSession = sessionsSoFar > 0 ? monthPnL / sessionsSoFar : 0;
  const expectedRemainingSessions = Math.max(
    0,
    Math.round((sessionRate || 0) * daysLeft)
  );
  const projectedPnL = monthPnL + avgPerSession * expectedRemainingSessions;
  const projectedBase = projectedPnL - expenses;
  const projectedPayout = Math.max(0, projectedBase * payoutRate);

  // UI: adicionar despesa
  const [add, setAdd] = useState("");
  const [saving, setSaving] = useState(false);

  const onAddExpense = async () => {
    const v = parseFloat(add || "");
    if (!isFinite(v)) {
      alert("Valor inválido");
      return;
    }
    if (v < 0) {
      alert("Usa valores positivos para despesas.");
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert("Sessão expirada. Faz login novamente.");
      return;
    }
    setSaving(true);
    try {
      await addMonthExpense(uid, y, m, v);
      setAdd("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h3 className="font-bold mb-2">Pagamento</h3>

      {/* grade de KPI cards: 2 col em mobile, 4 col em md+ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          label="PnL acumulado (mês)"
          value={fmtMoney(monthPnL, currency)}
          tone={monthPnL >= 0 ? "pos" : "neg"}
        />
        <Kpi
          label="Despesas (mês)"
          value={fmtMoney(expenses, currency)}
          hint="Somatório das despesas."
        />
        <Kpi
          label="Base do payout"
          value={fmtMoney(base, currency)}
          hint="PnL do mês − despesas"
          tone={base >= 0 ? "pos" : "neg"}
        />
        <Kpi
          label="Payout disponível (35%)"
          value={fmtMoney(payoutNow, currency)}
          chip
          tone={payoutNow > 0 ? "pos" : undefined}
        />

        <Kpi
          label="Média por sessão"
          value={fmtMoney(avgPerSession, currency)}
          hint={
            sessionsSoFar > 0
              ? `${sessionsSoFar} sessões com trades`
              : "Sem sessões com trades"
          }
        />
        <Kpi
          label="Sessões restantes (estim.)"
          value={`${expectedRemainingSessions}`}
          hint={`Dias restantes: ${daysLeft} • Ritmo ${((sessionRate || 0) * 100).toFixed(1)}%`}
        />
        <Kpi
          label="PnL projetado (fim do mês)"
          value={fmtMoney(projectedPnL, currency)}
          tone={projectedPnL >= 0 ? "pos" : "neg"}
          hint={`Payout projetado (35%): ${fmtMoney(projectedPayout, currency)}`}
        />

        {/* Card de ação: adicionar despesa */}
        <div className="rounded-xl border border-line bg-slate-900/40 p-3 min-w-0 text-center flex flex-col items-center justify-center">
          <div className="text-sub text-[11px] md:text-xs leading-tight mb-1">
            Adicionar Despesa (mês)
          </div>
          <div className="flex w-full items-center justify-center gap-2">
            <input
              className="input w-full"
              placeholder="Valor (ex: 12.50)"
              inputMode="decimal"
              value={add}
              onChange={(e) => setAdd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onAddExpense();
              }}
              aria-label="Adicionar despesa do mês"
            />
            <button className="btn" disabled={saving} onClick={onAddExpense}>
              {saving ? "..." : "Adicionar"}
            </button>
          </div>
          <div className="text-sub small mt-2">
            Usa valores positivos.
          </div>
        </div>
      </div>
    </div>
  );
}

/** Card de KPI reutilizável, com textos centrados */
function Kpi({
  label,
  value,
  hint,
  tone,
  chip,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "pos" | "neg";
  chip?: boolean;
}) {
  const color =
    tone === "pos" ? "text-ok" : tone === "neg" ? "text-danger" : "text-slate-200";
  return (
    <div className="rounded-xl border border-line bg-slate-900/40 p-2 md:p-3 min-w-0 text-center">
      <div className="text-sub text-[11px] md:text-xs leading-tight truncate">{label}</div>
      {chip ? (
        <div
          className={`inline-block mt-1 px-2 py-1 rounded-full border ${
            tone === "pos"
              ? "text-green-500 bg-green-950/70 border-green-800/60"
              : "text-slate-300 bg-slate-800/70 border-slate-700/60"
          } text-sm md:text-base`}
          title={value}
        >
          {value}
        </div>
      ) : (
        <div
          className={`font-semibold ${color} text-sm md:text-base leading-tight whitespace-nowrap truncate`}
          title={value}
        >
          {value}
        </div>
      )}
      {hint && <div className="text-sub small mt-1 truncate" title={hint}>{hint}</div>}
    </div>
  );
}
