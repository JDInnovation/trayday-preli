"use client";

import React, { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase.client";
import {
  openTrade,
  listenUser,
} from "@/lib/firestore";
import type { Trade, UserDoc } from "@/lib/types";
import { fmtMoney } from "@/lib/utils";

type TradeKind = "short" | "normal" | "long";

const KIND_LABEL: Record<TradeKind, string> = {
  short: "Trade Curta",
  normal: "Trade Normal",
  long: "Trade Longa",
};

// multiplicadores aconselhados (fallback caso o user não tenha prefs gravadas)
const DEFAULT_MULTIPLIERS = {
  short: 6,
  normal: 3,
  long: 1.8,
};

export default function OrderForm() {
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [symbol, setSymbol] = useState("");
  const [riskAmount, setRiskAmount] = useState<number>(0);
  const [fees, setFees] = useState<number>(0);
  const [sizeUsd, setSizeUsd] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [kind, setKind] = useState<TradeKind>("normal");
  const [submitting, setSubmitting] = useState(false);

  // subscreve user para saber saldo, moeda e (se existir) preferências/multipliers
  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    const unsub = listenUser(u.uid, (ud) => setUserDoc(ud));
    return () => unsub && unsub();
  }, []);

  const currency = userDoc?.currency || "EUR";
  const balance = userDoc?.currentBalance || 0;

  const multipliers = useMemo(() => {
    const prefs = (userDoc as any)?.preferences?.tradeMultipliers as
      | { short: number; normal: number; long: number }
      | undefined;
    return {
      short: prefs?.short ?? DEFAULT_MULTIPLIERS.short,
      normal: prefs?.normal ?? DEFAULT_MULTIPLIERS.normal,
      long: prefs?.long ?? DEFAULT_MULTIPLIERS.long,
    };
  }, [userDoc]);

  const suggestedSize = useMemo(() => {
    const m = multipliers[kind];
    return balance * m;
  }, [balance, multipliers, kind]);

  const sizeTooBig = sizeUsd > suggestedSize && suggestedSize > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.currentUser) return;
    if (!symbol.trim()) return;

    try {
      setSubmitting(true);
      const t: Omit<Trade, "id"> = {
        symbol: symbol.trim().toUpperCase(),
        side: "n/a", // simplificado — lado não usado no teu fluxo
        riskAmount: Number(riskAmount) || 0,
        fees: Number(fees) || 0,
        sizeUsd: Number(sizeUsd) || 0,
        notes: notes.trim(),
        status: "open",
        openAt: Date.now(),
        closedAt: null,
        pnl: null,
        r: null,
        type: kind, // guarda o tipo de trade selecionado
      } as any;

      await openTrade(auth.currentUser.uid, t);

      // reset
      setSymbol("");
      setRiskAmount(0);
      setFees(0);
      setSizeUsd(0);
      setNotes("");
      setKind("normal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card w-full max-w-full overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-semibold leading-tight">
              Abrir Trade
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {fmtMoney(suggestedSize, currency)}
            </p>
          </div>

          {/* Selector do tipo de trade */}
          <div className="shrink-0">
            <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
              {(["short", "normal", "long"] as TradeKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition min-w-0
                    ${kind === k ? "bg-primary text-primary-foreground" : "hover:bg-white/10"}`}
                >
                  {KIND_LABEL[k]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* GRID RESPONSIVA - nunca “sangra” em mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="min-w-0">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Símbolo
              </label>
              <input
                className="w-full min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="AAPL, EURUSD..."
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Risco (€ / $)
              </label>
              <input
                type="number"
                className="w-full min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                value={riskAmount}
                onChange={(e) => setRiskAmount(Number(e.target.value))}
              />
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Taxas / Fees ({currency})
              </label>
              <input
                type="number"
                className="w-full min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                value={fees}
                onChange={(e) => setFees(Number(e.target.value))}
              />
            </div>

            <div className="min-w-0 sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Tamanho da Ordem (USD)
              </label>
              <input
                type="number"
                className={`w-full min-w-0 rounded-xl border px-3 py-2 outline-none focus:ring-2
                 ${sizeTooBig ? "border-red-400/60 bg-red-500/5 focus:ring-red-400/40" : "border-white/10 bg-white/5 focus:ring-primary/40"}`}
                value={sizeUsd}
                onChange={(e) => setSizeUsd(Number(e.target.value))}
              />
              {sizeTooBig && (
                <p className="mt-1 text-[11px] text-red-300">
                  Acima do aconselhado ({fmtMoney(suggestedSize, currency)}).
                </p>
              )}
            </div>

            <div className="min-w-0 sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Notas (opcional)
              </label>
              <textarea
                rows={3}
                className="w-full min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contexto da trade, ideia, setup..."
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting || !symbol.trim()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "A abrir..." : "Abrir Trade"}
            </button>
            <div className="text-xs text-muted-foreground">
              Saldo: <span className="font-medium">{fmtMoney(balance, currency)}</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
