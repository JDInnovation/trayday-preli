"use client";

import { useEffect, useState } from "react";
import { Trade, TradeTypeKey } from "@/lib/types";
import { auth } from "@/lib/firebase.client";
import { openTrade } from "@/lib/firestore";
import { fmtMoney, typeFactor } from "@/lib/utils";

export default function OrderForm({
  balance,
  currency,
}: {
  balance: number;
  currency: string;
}) {
  const [tType, setTType] = useState<TradeTypeKey>("normal");
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");
  const [riskPct, setRiskPct] = useState(1);
  const [fees, setFees] = useState(0);
  const [sizeUsd, setSizeUsd] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  // sugestão automática quando muda o tipo
  useEffect(() => {
    const suggested = (balance || 0) * typeFactor(tType);
    if (sizeUsd === "") setSizeUsd(Number(suggested.toFixed(2)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tType, balance]);

  const recommended = (balance || 0) * typeFactor(tType);
  const hint =
    tType === "curta"
      ? `Curta ×6`
      : tType === "longa"
      ? `Longa ×1,8`
      : `Normal ×3`;

  const submit = async () => {
    try {
      setErr("");
      const uid = auth.currentUser?.uid!;
      const size = Number(sizeUsd);
      if (!symbol || isNaN(size) || size <= 0) {
        setErr("Preenche os campos corretamente.");
        return;
      }
      const riskAmount = (riskPct / 100) * (balance || 0);
      const trade: Omit<Trade, "id"> = {
        symbol: symbol.toUpperCase().trim(),
        side,
        riskPct,
        riskAmount,
        fees,
        sizeUsd: size,
        tType,
        note,
        openAt: Date.now(),
        status: "open",
        balanceBefore: balance || 0,
        recommended,
        oversized: size > recommended,
      };
      await openTrade(uid, trade);
      // reset parcial
      setSymbol("");
      setFees(0);
      setSizeUsd("");
      setNote("");
    } catch (e: any) {
      setErr(e.message || "Erro ao abrir trade");
    }
  };

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="font-bold">Abrir trade</h3>
        <span className="badge">{hint}: {fmtMoney(recommended, currency)}</span>
      </div>

      {/* Tipo de trade */}
      <div className="flex gap-2 p-1 mb-3">
        {[
          { key: "curta", label: "Curta (×6)" },
          { key: "normal", label: "Normal (×3)" },
          { key: "longa", label: "Longa (×1,8)" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            className={`px-3 py-2 rounded-lg border text-sm font-medium ${
              tType === t.key
                ? "btn-primary"
                : "btn-ghost"
            }`}
            onClick={() => setTType(t.key as TradeTypeKey)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="min-w-0">
          <label className="label">Símbolo</label>
          <input
            className="input w-full"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="BTC,ETH,SOL..."
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        <div>
          <label className="label">Lado</label>
          <select
            className="select w-full"
            value={side}
            onChange={(e) => setSide(e.target.value as any)}
          >
            <option>LONG</option>
            <option>SHORT</option>
          </select>
        </div>

        <div>
          <label className="label">Risco (%)</label>
          <input
            className="input w-full"
            type="number"
            step="0.1"
            inputMode="decimal"
            value={riskPct}
            onChange={(e) => setRiskPct(parseFloat(e.target.value || "0"))}
          />
        </div>

        <div>
          <label className="label">Taxa (fees)</label>
          <input
            className="input w-full"
            type="number"
            step="0.01"
            inputMode="decimal"
            value={fees}
            onChange={(e) => setFees(parseFloat(e.target.value || "0"))}
          />
        </div>

        <div>
          <label className="label">Tamanho (USD)</label>
          <input
            className={`input w-full ${Number(sizeUsd) > recommended ? "ring-1 ring-red-400/60" : ""}`}
            type="number"
            step="0.01"
            inputMode="decimal"
            value={sizeUsd}
            onChange={(e) =>
              setSizeUsd(e.target.value === "" ? "" : parseFloat(e.target.value))
            }
            placeholder={fmtMoney(recommended, currency)}
          />
          {Number(sizeUsd) > recommended && (
            <div className="small text-danger mt-1">
              Atenção ao risco.
            </div>
          )}
        </div>

        <div className="min-w-0">
          <label className="label">Notas</label>
          <input
            className="input w-full"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="setup, emoções, etc."
          />
        </div>
      </div>

      {err && <div className="text-danger text-sm mt-2">{err}</div>}

      <div className="flex justify-end mt-3">
        <button className="btn" onClick={submit}>
          Abrir
        </button>
      </div>
    </div>
  );
}
