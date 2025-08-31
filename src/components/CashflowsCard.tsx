// src/components/CashflowsCard.tsx
"use client";

import React from "react";
import type { Cashflow } from "@/lib/types";
import { fmtMoney } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { auth } from "@/lib/firebase.client";
import { deleteCashflow } from "@/lib/firestore";

type Props = {
  cashflows: Cashflow[];
  currency: string;
};

export default function CashflowsCard({ cashflows, currency }: Props) {
  const uid = auth.currentUser?.uid || null;

  async function handleDelete(id: string) {
    if (!uid) return;
    const ok = confirm("Remover este movimento?");
    if (!ok) return;
    try {
      await deleteCashflow(uid, id);
    } catch (e) {
      console.error(e);
      alert("Falha ao remover movimento.");
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Movimentos</h3>
        <span className="text-xs opacity-60">
          {cashflows.length} registo{cashflows.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="divide-y divide-white/10 rounded-xl ring-1 ring-white/10 overflow-hidden">
        {cashflows.length === 0 ? (
          <div className="p-4 text-sm opacity-60">Sem movimentos.</div>
        ) : (
          cashflows.map((cf) => (
            <div key={cf.id} className="p-3 sm:p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium break-words">
                  {cf.note?.trim() || "Movimento"}
                </div>
                <div className="text-xs opacity-60">
                  {new Date(cf.ts).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div
                  className={`text-sm font-semibold tabular-nums ${
                    (cf.amount || 0) >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {fmtMoney(cf.amount || 0, currency)}
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  title="Remover"
                  onClick={() => handleDelete(cf.id)}
                >
                  <Trash2 className="w-4 h-4 opacity-70" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
