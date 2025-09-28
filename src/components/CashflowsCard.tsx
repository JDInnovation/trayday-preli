// src/components/CashflowsCard.tsx
"use client";

import React, { useMemo } from "react";
import { Cashflow } from "@/lib/types";
import { fmtMoney } from "@/lib/utils";

type Props = {
  cashflows: Cashflow[];
  currency: string;
};

function fmtDatePT(ts?: number | null): string {
  if (typeof ts !== "number" || !isFinite(ts)) return "—";
  try {
    return new Date(ts).toLocaleString("pt-PT");
  } catch {
    return "—";
  }
}

export default function CashflowsCard({ cashflows, currency }: Props) {
  const list = useMemo(() => {
    // ordena do mais recente para o mais antigo, usando ts ou date como fallback
    return [...cashflows].sort((a, b) => {
      const at = (a.ts ?? a.date ?? 0) as number;
      const bt = (b.ts ?? b.date ?? 0) as number;
      return bt - at;
    });
  }, [cashflows]);

  const total = useMemo(
    () => list.reduce((acc, c) => acc + (Number(c.amount ?? 0) || 0), 0),
    [list]
  );

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <h3 className="font-semibold leading-tight">Movimentos da conta</h3>
          <div className="small text-sub">
            Total (listado):{" "}
            <span className={total >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {fmtMoney(total, currency)}
            </span>
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="text-sm opacity-70">Sem movimentos registados.</div>
      ) : (
        <div className="flex flex-col divide-y divide-white/10">
          {list.map((cf, idx) => {
            const ts = (cf.ts ?? cf.date) as number | undefined;
            const dateStr = fmtDatePT(ts);
            const type = cf.type ?? cf.kind ?? "—";
            const note = (cf.note ?? cf.description ?? "").toString();
            const amt = Number(cf.amount ?? 0) || 0;
            const amtClass = amt >= 0 ? "text-emerald-400" : "text-rose-400";

            return (
              <div
                key={cf.id ?? `${(ts ?? 0).toString()}-${idx}`}
                className="py-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="badge">{type}</span>
                    <div className="text-sm font-medium truncate max-w-[22rem]">
                      {note || "—"}
                    </div>
                  </div>
                  <div className="text-xs opacity-60 mt-0.5">{dateStr}</div>
                </div>
                <div className={`shrink-0 font-semibold ${amtClass}`}>
                  {fmtMoney(amt, currency)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
