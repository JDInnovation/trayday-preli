// src/components/CashflowsCard.tsx
"use client";

import React, { useMemo, useState } from "react";
import type { Cashflow } from "@/lib/types";
import { fmtMoney } from "@/lib/utils";
import { Plus, Minus, Save, Trash2 } from "lucide-react";
import { auth } from "@/lib/firebase.client";
import { addCashflow, deleteCashflow } from "@/lib/firestore";

type Props = {
  cashflows: Cashflow[];
  currency: string;
};

export default function CashflowsCard({ cashflows, currency }: Props) {
  const uid = auth.currentUser?.uid || null;

  // ---- form state (add movement)
  const [mode, setMode] = useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const parsedAmount = useMemo(() => {
    const n = Number(amount.replace(",", "."));
    return Number.isFinite(n) ? Math.abs(n) : 0;
  }, [amount]);

  const signedAmount = mode === "deposit" ? parsedAmount : -parsedAmount;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    if (!parsedAmount || parsedAmount <= 0) {
      alert("Indica um valor válido.");
      return;
    }
    try {
      setSaving(true);
      await addCashflow(uid, signedAmount, note.trim() || undefined);
      // reset
      setAmount("");
      setNote("");
    } catch (err) {
      console.error(err);
      alert("Não foi possível registar o movimento.");
    } finally {
      setSaving(false);
    }
  }

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

  function quick(n: number) {
    setAmount((prev) => {
      const cur = Number(prev.replace(",", ".")) || 0;
      const next = Math.max(0, cur + n);
      return String(next);
    });
  }

  return (
    <div className="card w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Movimentos</h3>
        <span className="text-xs opacity-60">
          {cashflows.length} registo{cashflows.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Add movement form */}
      <form onSubmit={handleAdd} className="rounded-xl ring-1 ring-white/10 p-3 sm:p-4 space-y-3">
        {/* Mode + amount row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {/* Mode pills */}
          <div className="col-span-2 sm:col-span-2 flex rounded-lg overflow-hidden ring-1 ring-white/10">
            <button
              type="button"
              onClick={() => setMode("deposit")}
              className={`flex-1 py-2 text-sm font-medium transition ${
                mode === "deposit" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 opacity-80 hover:opacity-100"
              }`}
              aria-pressed={mode === "deposit"}
            >
              <div className="inline-flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> 
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMode("withdrawal")}
              className={`flex-1 py-2 text-sm font-medium transition ${
                mode === "withdrawal" ? "bg-rose-500/15 text-rose-300" : "bg-white/5 opacity-80 hover:opacity-100"
              }`}
              aria-pressed={mode === "withdrawal"}
            >
              <div className="inline-flex items-center gap-1.5">
                <Minus className="w-4 h-4" />
              </div>
            </button>
          </div>

          {/* Amount */}
          <div className="col-span-2 sm:col-span-2">
            <label className="block text-xs opacity-70 mb-1">Valor</label>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
            />
            <div className="mt-1 flex gap-2">
              {[25, 50, 100].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => quick(n)}
                  className="rounded px-2 py-1 text-xs bg-white/5 ring-1 ring-white/10 hover:bg-white/10"
                  title={`+${n}`}
                >
                  +{n}
                </button>
              ))}
            </div>
          </div>

          {/* Preview signed */}
          <div className="col-span-2 sm:col-span-1 flex items-end">
            <div className="w-full rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 text-xs sm:text-sm text-right tabular-nums">
              {signedAmount === 0 ? "—" : fmtMoney(signedAmount, currency)}
            </div>
          </div>
        </div>

        {/* Note + submit */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <label className="block text-xs opacity-70 mb-1">Nota (opcional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={mode === "deposit" ? "Depósito" : "Levantamento"}
              className="w-full rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !parsedAmount}
            className="mt-1 sm:mt-6 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 bg-white/10 hover:bg-white/15 ring-1 ring-white/10 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            title="Guardar movimento"
          >
            <Save className="w-4 h-4" />
            Guardar
          </button>
        </div>
      </form>

      {/* List */}
      <div className="divide-y divide-white/10 rounded-xl ring-1 ring-white/10 overflow-hidden">
        {cashflows.length === 0 ? (
          <div className="p-4 text-sm opacity-60">Sem movimentos.</div>
        ) : (
          cashflows.map((cf) => (
            <div key={cf.id} className="p-3 sm:p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium break-words">
                  {cf.note?.trim() || (cf.amount || 0) >= 0 ? "Depósito" : "Levantamento"}
                </div>
                <div className="text-xs opacity-60">
                  {new Date(cf.ts).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div
                  className={`text-sm font-semibold tabular-nums ${
                    (cf.amount || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
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
