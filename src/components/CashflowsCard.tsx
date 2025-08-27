"use client";

import { auth } from "@/lib/firebase.client";
import { addCashflow, deleteCashflow } from "@/lib/firestore";
import { Cashflow } from "@/lib/types";
import { fmtMoney } from "@/lib/utils";
import { useMemo, useState } from "react";

export default function CashflowsCard({
  cashflows,
  currency,
}: {
  cashflows: Cashflow[];
  currency: string;
}) {
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const last5 = useMemo(
    () => [...cashflows].sort((a, b) => b.ts - a.ts).slice(0, 5),
    [cashflows]
  );

  const add = async () => {
    const val = parseFloat(amount);
    if (!isFinite(val) || val === 0) {
      alert("Indica um valor (positivo depósito, negativo levantamento).");
      return;
    }
    await addCashflow(auth.currentUser!.uid, val, note);
    setAmount("");
    setNote("");
  };

  const del = async (id: string) => {
    if (!confirm("Eliminar este movimento?")) return;
    await deleteCashflow(auth.currentUser!.uid, id);
  };

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="font-bold">Movimentos de conta</h3>
        <span className="badge">{currency}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Montante ({currency})</label>
          <input
            className="input w-full"
            type="number"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="ex.: 250 ou -100"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Nota (opcional)</label>
          <input
            className="input w-full"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ex.: ajuste, comissão, transferência…"
          />
        </div>
      </div>

      <div className="flex justify-end mt-3">
        <button className="btn" onClick={add}>
          Registar movimento
        </button>
      </div>

      <div className="small mt-3">Últimos 5</div>

      <div className="table-wrap mt-1 max-h-64 overflow-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Valor</th>
              <th>Nota</th>
              <th className="text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {last5.map((c) => (
              <tr key={c.id}>
                <td className="small whitespace-nowrap">
                  {new Date(c.ts).toLocaleString("pt-PT")}
                </td>
                <td className={c.amount >= 0 ? "text-ok" : "text-danger"}>
                  {fmtMoney(c.amount, currency)}
                </td>
                <td className="small max-w-[14rem] truncate">{c.note || "—"}</td>
                <td className="text-right">
                  <button className="btn-ghost" onClick={() => del(c.id)}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {last5.length === 0 && (
              <tr>
                <td className="small" colSpan={4}>
                  Sem movimentos ainda.
                </td>
              </tr>
            )}
          </tbody>
          {cashflows.length > 5 && (
            <tfoot>
              <tr>
                <td colSpan={4} className="small">
                  A mostrar 5 de {cashflows.length}.
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
