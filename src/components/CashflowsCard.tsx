"use client";

import { auth } from "@/lib/firebase.client";
import { addCashflow, deleteCashflow } from "@/lib/firestore";
import { Cashflow } from "@/lib/types";
import { fmtMoney } from "@/lib/utils";
import { useState } from "react";

export default function CashflowsCard({ cashflows, currency }: { cashflows: Cashflow[]; currency: string }) {
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const add = async () => {
    const val = parseFloat(amount);
    if (!isFinite(val) || val === 0) { alert("Indica um valor (positivo para depósito, negativo para levantamento)."); return; }
    await addCashflow(auth.currentUser!.uid, val, note);
    setAmount(""); setNote("");
  };

  const del = async (id: string) => {
    if (!confirm("Eliminar este movimento?")) return;
    await deleteCashflow(auth.currentUser!.uid, id);
  };

  return (
    <div className="card">
      <h3 className="font-bold mb-2">Movimentos de conta</h3>
      <div className="grid md:grid-cols-3 gap-3">
        <div><label className="label">Montante (+ depósito, − levantamento)</label><input className="input" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></div>
        <div><label classhhhonal)</label><input className="input" value={note} onChange={e => setNote(e.target.value)} /></div>
        <div className="flex items-end justify-end"><button className="btn" onClick={add}>Registar movimento</button></div>
      </div>

      <div className="small mt-3">Últimos 5:</div>
      <table className="table mt-1">
        <thead><tr><th>Quando</th><th>Valor</th><th>Nota</th><th>Ação</th></tr></thead>
        <tbody>
        {cashflows.slice(0,5).map(c => (
          <tr key={c.id}>
            <td className="small">{new Date(c.ts).toLocaleString("pt-PT")}</td>
            <td className={c.amount >= 0 ? "text-ok" : "text-danger"}>{fmtMoney(c.amount, currency)}</td>
            <td className="small">{c.note || "—"}</td>
            <td><button className="btn-ghost" onClick={() => del(c.id)}>×</button></td>
          </tr>
        ))}
        {cashflows.length === 0 && <tr><td className="small" colSpan={4}>Sem movimentos ainda.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
