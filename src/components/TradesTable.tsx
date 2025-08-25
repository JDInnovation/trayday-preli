"use client";

import { Trade } from "@/lib/types";
import { useMemo, useState } from "react";
import { closeTrade, editTrade } from "@/lib/firestore";
import { auth } from "@/lib/firebase.client";
import { typeFactor } from "@/lib/utils";
import { Pencil } from "lucide-react";

const PAGE_SIZE = 10;

export default function TradesTable({ trades }: { trades: Trade[] }) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(trades.length / PAGE_SIZE));
  const pageTrades = useMemo(() => trades.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE), [trades, page]);

  const doClose = async (t: Trade, pnlStr: string) => {
    const pnl = parseFloat(pnlStr);
    if (!isFinite(pnl)) { alert("PnL inválido"); return; }
    await closeTrade(auth.currentUser!.uid, t.id, pnl);
  };

  const doEdit = async (t: Trade) => {
    const symbol = prompt("Símbolo:", t.symbol) || t.symbol;
    const side = (prompt("Lado (LONG/SHORT):", t.side) || t.side) as any;
    const riskPct = parseFloat(prompt("Risco %:", String(t.riskPct)) || String(t.riskPct));
    const fees = parseFloat(prompt("Taxa (fees):", String(t.fees)) || String(t.fees));
    const sizeUsd = parseFloat(prompt("Tamanho USD:", String(t.sizeUsd)) || String(t.sizeUsd));
    const status = (prompt("Status (open/closed):", t.status) || t.status) as any;
    const note = prompt("Notas:", t.note || "") || "";

    const next: Trade = {
      ...t, symbol, side, riskPct, fees, sizeUsd, status, note,
      // recomputa oversized vs recomendado
      recommended: (t.balanceBefore || 0) * typeFactor(t.tType),
      oversized: sizeUsd > ((t.balanceBefore || 0) * typeFactor(t.tType))
    };

    if (status === "closed") {
      const pnl = parseFloat(prompt("PnL (USD):", String(t.pnl ?? 0)) || String(t.pnl ?? 0));
      next.pnl = pnl;
      next.closedAt = t.closedAt || Date.now();
    } else {
      next.pnl = null;
      next.closedAt = null;
    }

    await editTrade(auth.currentUser!.uid, next);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold">Trades — últimas</h3>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={() => setPage(p => Math.max(0, p-1))}>«</button>
          <div className="small">Página <b>{totalPages === 0 ? 0 : page + 1}</b> de <b>{totalPages}</b></div>
          <button className="btn-ghost" onClick={() => setPage(p => Math.min(totalPages-1, p+1))}>»</button>
        </div>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Aberta</th><th>Fechada</th><th>Symbol</th><th>Lado</th>
            <th>Risco%</th><th>Taxa</th><th>Tamanho USD</th>
            <th>Status</th><th>Resultado</th><th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {pageTrades.map(t => {
            const rec = (t.balanceBefore || 0) * typeFactor(t.tType);
            const oversized = (t.sizeUsd || 0) > rec;
            return (
              <tr key={t.id} className={oversized ? "outline outline-2 outline-danger/50" : ""}>
                <td className="small">{new Date(t.openAt).toLocaleString("pt-PT")}</td>
                <td className="small">{t.closedAt ? new Date(t.closedAt).toLocaleString("pt-PT") : "—"}</td>
                <td>{t.symbol}</td>
                <td>{t.side}</td>
                <td>{t.riskPct}%</td>
                <td>{(t.fees || 0).toFixed(2)}</td>
                <td>${(t.sizeUsd || 0).toFixed(2)} {oversized && <span title={`Acima do recomendado (${rec.toFixed(2)})`} className="ml-1 text-danger font-extrabold">⚠</span>}</td>
                <td>{t.status}</td>
                <td className={t.pnl ? (t.pnl > 0 ? "text-ok" : "text-danger") : "text-sub"}>
                  {t.status === "closed" ? (t.pnl || 0).toFixed(2) : "—"}
                </td>
                <td>
                  {t.status === "open" ? (
                    <div className="flex items-center gap-2">
                      <input className="input w-28" placeholder="PnL (USD)" id={`pnl-${t.id}`} />
                      <button className="btn" onClick={() => {
                        const val = (document.getElementById(`pnl-${t.id}`) as HTMLInputElement)?.value || "";
                        doClose(t, val);
                      }}>Fechar</button>
                      <button className="btn-ghost" onClick={() => doEdit(t)} title="Editar"><Pencil className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="small">R: {(t.r ?? 0).toFixed(2)}</span>
                      <button className="btn-ghost" onClick={() => doEdit(t)} title="Editar"><Pencil className="w-4 h-4" /></button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
          {pageTrades.length === 0 && <tr><td className="small" colSpan={10}>Sem trades nesta página.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
