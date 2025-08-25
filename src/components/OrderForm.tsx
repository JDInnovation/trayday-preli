"use client";

import { useEffect, useState } from "react";
import { Trade, TradeTypeKey } from "@/lib/types";
import { auth } from "@/lib/firebase";
import { openTrade } from "@/lib/firestore";
import { fmtMoney, typeFactor } from "@/lib/utils";

export default function OrderForm({ balance, currency }: { balance: number; currency: string }) {
  const [tType, setTType] = useState<TradeTypeKey>("normal");
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");
  const [riskPct, setRiskPct] = useState(1);
  const [fees, setFees] = useState(0);
  const [sizeUsd, setSizeUsd] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const suggested = (balance || 0) * typeFactor(tType);
    if (sizeUsd === "") setSizeUsd(Number(suggested.toFixed(2)));
  }, [tType, balance]); // eslint-disable-line

  const hint = `Sugestão "${tType === "curta" ? "Curta ×6" : tType === "longa" ? "Longa ×1,8" : "Normal ×3"}": ${fmtMoney((balance || 0) * typeFactor(tType), currency)}`;

  const submit = async () => {
    try {
      setErr("");
      const uid = auth.currentUser?.uid!;
      const recommended = (balance || 0) * typeFactor(tType);
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
        oversized: size > recommended
      };
      await openTrade(uid, trade);
      setSymbol(""); setFees(0); setSizeUsd(""); setNote("");
    } catch (e: any) {
      setErr(e.message || "Erro ao abrir trade");
    }
  };

  return (
    <div className="card">
      <h3 className="font-bold mb-2">Abrir trade</h3>
      <div className="segmented mb-3 flex gap-2 p-1">
        {[
          { key: "curta", label: "Curta (×6)" },
          { key: "normal", label: "Normal (×3)" },
          { key: "longa", label: "Longa (×1,8)" }
        ].map((t) => (
          <button key={t.key}
            className={`flex-1 border border-slate-700 rounded-lg px-3 py-2 font-bold ${tType === t.key ? "bg-brand text-bg border-transparent" : "bg-transparent"}`}
            onClick={() => setTType(t.key as TradeTypeKey)}
          >{t.label}</button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div><label className="label">Símbolo</label><input className="input" value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="EURUSD, BTCUSDT, TSLA" /></div>
        <div><label className="label">Lado</label>
          <select className="select" value={side} onChange={e => setSide(e.target.value as any)}><option>LONG</option><option>SHORT</option></select>
        </div>
        <div><label className="label">Risco %</label><input className="input" type="number" step="0.1" value={riskPct} onChange={e => setRiskPct(parseFloat(e.target.value))} /></div>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mt-3">
        <div><label className="label">Taxa (fees)</label><input className="input" type="number" step="0.01" value={fees} onChange={e => setFees(parseFloat(e.target.value))} /></div>
        <div><label className="label">Tamanho da ordem (USD)</label><input className="input" type="number" step="0.01" value={sizeUsd} onChange={e => setSizeUsd(e.target.value === "" ? "" : parseFloat(e.target.value))} /></div>
        <div><label className="label">Notas</label><input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="setup, emoções, etc." /></div>
      </div>

      <div className="small mt-2">{hint}</div>
      {err && <div className="text-danger text-sm mt-2">{err}</div>}
      <div className="flex justify-end mt-3"><button className="btn" onClick={submit}>Abrir</button></div>
    </div>
  );
}
