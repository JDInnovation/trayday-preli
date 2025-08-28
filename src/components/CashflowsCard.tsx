"use client";

import React, { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase.client";
import {
  addCashflow,
  deleteCashflow,
  listenCashflows,
  listenUser,
} from "@/lib/firestore";
import type { Cashflow, UserDoc } from "@/lib/types";
import { fmtMoney } from "@/lib/utils";

function humanDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString();
}

export default function CashflowsCard() {
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [list, setList] = useState<Cashflow[]>([]);
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    const un1 = listenUser(u.uid, (ud) => setUserDoc(ud));
    const un2 = listenCashflows(u.uid, (arr) => setList(arr));
    return () => {
      un1 && un1();
      un2 && un2();
    };
  }, []);

  const currency = userDoc?.currency || "EUR";

  async function addDeposit() {
    if (!auth.currentUser) return;
    if (!amount) return;
    await addCashflow(auth.currentUser.uid, Math.abs(amount), note);
    setAmount(0);
    setNote("");
  }

  async function addWithdraw() {
    if (!auth.currentUser) return;
    if (!amount) return;
    await addCashflow(auth.currentUser.uid, -Math.abs(amount), note);
    setAmount(0);
    setNote("");
  }

  async function remove(id: string) {
    if (!auth.currentUser) return;
    await deleteCashflow(auth.currentUser.uid, id);
  }

  const totalMonth = useMemo(
    () => list.reduce((a, c) => a + (c.amount || 0), 0),
    [list]
  );

  return (
    <div className="card w-full max-w-full overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-semibold leading-tight">
              Movimentos da Conta
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Total (listado): {fmtMoney(totalMonth, currency)}
            </p>
          </div>
        </div>

        {/* FORM — grid responsiva, sem overflow em mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="min-w-0">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Valor ({currency})
            </label>
            <input
              type="number"
              className="w-full min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Ex.: 100"
            />
          </div>
          <div className="min-w-0 sm:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Nota (opcional)
            </label>
            <input
              className="w-full min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Depósito, levantamento, ajuste…"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={addDeposit}
            className="rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            + Depositar
          </button>
          <button
            onClick={addWithdraw}
            className="rounded-xl bg-rose-500/90 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            – Levantar
          </button>
        </div>

        {/* TABELA — wrapper com overflow-x-auto para mobile */}
        <div className="mt-5 w-full max-w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-white/10">
                <th className="py-2 pr-3 whitespace-nowrap">Data</th>
                <th className="py-2 pr-3 whitespace-nowrap">Valor</th>
                <th className="py-2 pr-3 min-w-[8rem]">Nota</th>
                <th className="py-2 pr-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-xs text-muted-foreground">
                    Sem movimentos ainda.
                  </td>
                </tr>
              )}

              {list.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-white/5 hover:bg-white/5 transition"
                >
                  <td className="py-2 pr-3 whitespace-nowrap text-xs sm:text-sm">
                    {humanDate(c.ts)}
                  </td>
                  <td
                    className={`py-2 pr-3 whitespace-nowrap text-xs sm:text-sm ${
                      (c.amount || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {fmtMoney(c.amount || 0, currency)}
                  </td>
                  <td className="py-2 pr-3">
                    <span className="block max-w-[14rem] sm:max-w-[20rem] truncate">
                      {c.note || "—"}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex justify-end">
                      <button
                        onClick={() => remove(c.id)}
                        className="rounded-md px-2 py-1 text-xs bg-white/10 hover:bg-white/15"
                        title="Eliminar"
                        aria-label="Eliminar movimento"
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
