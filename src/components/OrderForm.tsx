// src/components/OrderForm.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  Clock,
  Calendar as CalendarIcon,
  Plus,
  Rocket,
} from "lucide-react";
import { fmtMoney } from "@/lib/utils";
import { auth } from "@/lib/firebase.client";
import { openTrade, editTrade, tradesColRef } from "@/lib/firestore";
import type { Trade } from "@/lib/types";
import { doc, setDoc } from "firebase/firestore";

// === Tipos ===
type QuickMode = "curta" | "normal" | "longa";
type Leverage = { curta: number; normal: number; longa: number };
type RiskParams = {
  defaultRiskPct: number;
  maxLossPct: number;
  leverage: Leverage;
};

export default function OrderForm({
  balance,
  currency,
  // NOVO: parâmetros vindos das Definições (opcional)
  riskParams,
}: {
  balance: number;
  currency: string;
  riskParams?: RiskParams;
}) {
  // ---- UI State
  const [symbol, setSymbol] = useState<string>("");
  const [side, setSide] = useState<"long" | "short">("long");

  // risco (informativo) — inicializa a partir das definições se existirem
  const [riskPct, setRiskPct] = useState<number>(riskParams?.defaultRiskPct ?? 1.5);
  const riskMoney = useMemo<number>(
    () => Math.max(0, (balance || 0) * (riskPct / 100)),
    [balance, riskPct]
  );

  // perda máxima aconselhada (informativo)
  const [maxLossPct, setMaxLossPct] = useState<number>(riskParams?.maxLossPct ?? 2);
  const maxLossMoney = useMemo<number>(
    () => Math.max(0, (balance || 0) * (maxLossPct / 100)),
    [balance, maxLossPct]
  );

  // sincroniza se as definições forem atualizadas em runtime
  useEffect(() => {
    if (riskParams?.defaultRiskPct != null) setRiskPct(riskParams.defaultRiskPct);
    if (riskParams?.maxLossPct != null) setMaxLossPct(riskParams.maxLossPct);
  }, [riskParams?.defaultRiskPct, riskParams?.maxLossPct]);

  // saldo oculto
  const [showBalance, setShowBalance] = useState<boolean>(false);

  // alavancagens / quick buttons — usa as das definições se existirem
  const [mode, setMode] = useState<QuickMode>("normal");
  const SIZE_MULT = useMemo<Leverage>(
    () => ({
      curta: riskParams?.leverage?.curta ?? 1.8,
      normal: riskParams?.leverage?.normal ?? 3,
      longa: riskParams?.leverage?.longa ?? 6,
    }),
    [riskParams?.leverage?.curta, riskParams?.leverage?.normal, riskParams?.leverage?.longa]
  );
  const recommendedSize = useMemo<number>(
    () => Math.max(0, (balance || 0) * SIZE_MULT[mode]),
    [balance, mode, SIZE_MULT]
  );

  // tamanho usado (na moeda da conta)
  const [sizeUsed, setSizeUsed] = useState<number | "">("");

  // live vs backfill
  const [isLive, setIsLive] = useState<boolean>(true);

  // campos para ordem não-live (retroativa)
  const [openDate, setOpenDate] = useState<string>(""); // YYYY-MM-DD
  const [openTime, setOpenTime] = useState<string>(""); // HH:MM
  const [closeDate, setCloseDate] = useState<string>("");
  const [closeTime, setCloseTime] = useState<string>("");
  const [pnlInput, setPnlInput] = useState<number | "">("");
  const [fees, setFees] = useState<number | "">("");
  const [note, setNote] = useState<string>("");

  const [saving, setSaving] = useState<boolean>(false);
  const uid = auth.currentUser?.uid || null;

  // Preencher tamanho usado por defeito quando ainda está vazio
  useEffect(() => {
    if (sizeUsed === "") {
      setSizeUsed(Number(recommendedSize.toFixed(2)));
    }
  }, [recommendedSize, sizeUsed]);

  // helpers
  const applyQuick = (m: QuickMode) => {
    setMode(m);
    setSizeUsed(Number((balance * SIZE_MULT[m]).toFixed(2)));
  };

  const parseDateTime = (d: string, t: string): number | null => {
    if (!d || !t) return null;
    const ts = new Date(`${d}T${t}:00`);
    const n = ts.getTime();
    return Number.isFinite(n) ? n : null;
  };

  // validação básica
  const canSubmit = useMemo<boolean>(() => {
    if (!symbol.trim()) return false;
    if (!uid) return false;

    if (!isLive) {
      const oa = parseDateTime(openDate, openTime);
      const ca = parseDateTime(closeDate, closeTime);
      if (!oa || !ca) return false;
      if (pnlInput === "" || typeof pnlInput !== "number") return false;
    }
    return true;
  }, [symbol, uid, isLive, openDate, openTime, closeDate, closeTime, pnlInput]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!uid) {
      alert("Precisas de iniciar sessão.");
      return;
    }
    if (!canSubmit) return;

    setSaving(true);
    try {
      const sizeToPersist =
        typeof sizeUsed === "number" && sizeUsed > 0
          ? Number(sizeUsed.toFixed(2))
          : Number(recommendedSize.toFixed(2));

      if (isLive) {
        // ordem ao vivo -> criar aberta agora
        const now = Date.now();
        const payload: Omit<Trade, "id"> = {
          symbol: symbol.trim(),
          side,
          status: "open",
          openAt: now,
          riskAmount: Number(riskMoney.toFixed(2)),
          fees: typeof fees === "number" ? fees : 0,
          size: sizeToPersist, // tamanho na moeda da conta
          note: note || "",
        } as any;

        await openTrade(uid, payload);
        resetAfterSave(true);
        toastOk("Ordem registada (live).");
      } else {
        // ordem retroativa -> cria aberta na data/hora indicada e depois fecha com PnL e fecho personalizados
        const openAt = parseDateTime(openDate, openTime);
        const closedAt = parseDateTime(closeDate, closeTime);
        if (!openAt || !closedAt) throw new Error("Datas/horas inválidas.");
        const pnl = Number(pnlInput || 0);
        const f = Number(fees || 0);

        // criar doc como 'open' com ID auto (para depois fechar via editTrade)
        const ref = doc(tradesColRef(uid)); // doc com ID auto
        const newId = ref.id;

        const baseOpen: Trade = {
          id: newId,
          symbol: symbol.trim(),
          side,
          status: "open",
          openAt,
          riskAmount: Number(riskMoney.toFixed(2)),
          fees: f,
          size: sizeToPersist,
          note: note || "",
        } as any;

        await setDoc(ref, baseOpen);

        // fechar com os dados retroativos via editTrade (aplica delta no saldo)
        const closed: Trade = {
          ...baseOpen,
          status: "closed",
          pnl,
          closedAt,
        } as any;

        await editTrade(uid, closed);
        resetAfterSave(false);
        toastOk("Ordem retroativa registada.");
      }
    } catch (err: unknown) {
      console.error(err);
      toastErr(err instanceof Error ? err.message : "Falha ao registar ordem.");
    } finally {
      setSaving(false);
    }
  }

  const resetAfterSave = (keepLive: boolean) => {
    setSymbol("");
    setSide("long");
    setRiskPct(riskParams?.defaultRiskPct ?? 1.5);
    setMaxLossPct(riskParams?.maxLossPct ?? 2);
    setMode("normal");
    setSizeUsed("");
    setFees("");
    setNote("");
    if (!keepLive) {
      setOpenDate("");
      setOpenTime("");
      setCloseDate("");
      setCloseTime("");
      setPnlInput("");
    }
    setIsLive(keepLive);
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold flex items-center gap-2 text-lg">
          <Rocket className="w-5 h-5 opacity-80" />
          Registo de Ordem
        </h3>

        {/* Saldo (oculto por defeito) */}
        <div className="flex items-center gap-2 text-sm self-start sm:self-auto">
          <span className="opacity-70">Saldo:</span>
          <span className="font-semibold tabular-nums">
            {showBalance ? fmtMoney(balance || 0, currency) : "••••••"}
          </span>
          <button
            type="button"
            className="icon-btn"
            title={showBalance ? "Ocultar" : "Mostrar"}
            onClick={() => setShowBalance((v) => !v)}
          >
            {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Secção 1: Tamanhos rápidos + recomendado */}
      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {(["curta", "normal", "longa"] as QuickMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => applyQuick(m)}
              className={`chip ${mode === m ? "ring-emerald-500/40 bg-emerald-500/10" : ""}`}
              title={`Aplicar modo ${labelMode(m)} (x${SIZE_MULT[m]} do saldo)`}
            >
              {labelMode(m)}
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-neutral-900/70 ring-1 ring-white/10 p-3 flex items-center justify-between">
          <div className="text-sm opacity-80">
            <div className="font-medium">{labelMode(mode)}</div>
            <div className="opacity-60">Antes de Ganhar tenta na perder</div>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-60">Tamanho recomendado</div>
            <div className="font-semibold tabular-nums">
              {fmtMoney(recommendedSize, currency)}
            </div>
          </div>
        </div>
      </section>

      {/* Secção 2: Dados base */}
      <section className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Símbolo</label>
          <input
            className="input"
            placeholder="ex.: EURUSD / BTCUSDT / AAPL"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          />
        </div>
        <div>
          <label className="label">Lado</label>
          <div className="flex gap-1">
            <SegBtn
              active={side === "long"}
              onClick={() => setSide("long")}
              label="Long"
            />
            <SegBtn
              active={side === "short"}
              onClick={() => setSide("short")}
              label="Short"
            />
          </div>
        </div>
      </section>

      {/* Secção 3: Risco & Limites */}
      <section className="grid gap-3 md:grid-cols-4">
        <div>
          <label className="label">Risco (%)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              min={0}
              className="input"
              value={riskPct}
              onChange={(e) => setRiskPct(Number(e.target.value))}
            />
            <span className="small opacity-70">
              = {fmtMoney(riskMoney, currency)}
            </span>
          </div>
        </div>

        <div>
          <label className="label">Perda máx. (%)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              min={0}
              className="input"
              value={maxLossPct}
              onChange={(e) => setMaxLossPct(Number(e.target.value))}
              title="Percentagem de perda máxima aconselhada (apenas informativo)"
            />
            <span className="small opacity-70">
              = {fmtMoney(maxLossMoney, currency)}
            </span>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="label">Tamanho usado (na moeda da conta)</label>
          <input
            type="number"
            step="0.01"
            className="input"
            placeholder="ex.: 1500.00"
            value={sizeUsed}
            onChange={(e) =>
              setSizeUsed(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
        </div>
      </section>

      {/* Secção 4: Live vs Retroativa */}
      <section className="flex items-center gap-2">
        <input
          id="liveOrder"
          type="checkbox"
          className="scale-110 accent-emerald-500"
          checked={isLive}
          onChange={(e) => setIsLive(e.target.checked)}
        />
        <label htmlFor="liveOrder" className="select-none">
          Ordem live
        </label>
      </section>

      {/* Secção 5: Campos extra para ordem não-live */}
      {!isLive && (
        <section className="rounded-2xl bg-neutral-900/70 ring-1 ring-white/10 p-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label flex items-center gap-1">
                <CalendarIcon className="w-4 h-4 opacity-70" /> Abertura — Data
              </label>
              <input
                type="date"
                className="input"
                value={openDate}
                onChange={(e) => setOpenDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label flex items-center gap-1">
                <Clock className="w-4 h-4 opacity-70" /> Abertura — Hora
              </label>
              <input
                type="time"
                className="input"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label flex items-center gap-1">
                <CalendarIcon className="w-4 h-4 opacity-70" /> Fecho — Data
              </label>
              <input
                type="date"
                className="input"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label flex items-center gap-1">
                <Clock className="w-4 h-4 opacity-70" /> Fecho — Hora
              </label>
              <input
                type="time"
                className="input"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="label">PnL</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={pnlInput}
                onChange={(e) =>
                  setPnlInput(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </div>
            <div>
              <label className="label">Taxas/Fees</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={fees}
                onChange={(e) =>
                  setFees(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </div>
            <div>
              <label className="label">Nota (opcional)</label>
              <input
                className="input"
                placeholder="ex.: set-up, broker, etc."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        </section>
      )}

      {/* Ações */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          className="btn ghost"
          onClick={() => resetAfterSave(true)}
          disabled={saving}
        >
          Limpar
        </button>
        <button type="submit" className="btn" disabled={!canSubmit || saving}>
          {saving ? (
            <>
              <Clock className="w-4 h-4 animate-spin" />
              <span>A guardar…</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>
                {isLive ? "Registar ordem live" : "Registar ordem retroativa"}
              </span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

/* ----------------- Sub-componentes & utils ----------------- */

function SegBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-lg ring-1 text-sm ${
        active
          ? "bg-emerald-500/10 ring-emerald-500/40"
          : "bg-neutral-800/40 ring-white/10 hover:bg-neutral-800/60"
      }`}
    >
      {label}
    </button>
  );
}

function labelMode(m: QuickMode): string {
  if (m === "curta") return "Curta";
  if (m === "longa") return "Longa";
  return "Normal";
}

// toasts simples (podes ligar ao teu sistema)
function toastOk(msg: string) {
  if (typeof window !== "undefined") console.log(msg);
}
function toastErr(msg: string) {
  if (typeof window !== "undefined") console.error(msg);
}
