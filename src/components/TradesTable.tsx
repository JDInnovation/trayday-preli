"use client";

import React, { useMemo, useState } from "react";
import { Trade } from "@/lib/types";
import { closeTrade, editTrade } from "@/lib/firestore";
import { auth } from "@/lib/firebase.client";
import { typeFactor } from "@/lib/utils";
import { Pencil, ChevronDown, ChevronRight, Trash2, X } from "lucide-react";
import { deleteTrade } from "@/lib/trades";

const PAGE_SIZE = 10;

export default function TradesTable({ trades }: { trades: Trade[] }) {
  const [page, setPage] = useState(0);
  const [pnlInputs, setPnlInputs] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  const totalPages = Math.max(1, Math.ceil(trades.length / PAGE_SIZE));

  const pageTrades = useMemo(
    () => trades.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [trades, page]
  );

  const toggleExpand = (id: string) =>
    setExpanded((m) => ({ ...m, [id]: !m[id] }));

  const doClose = async (t: Trade) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert("Sessão expirada. Faz login novamente.");
      return;
    }
    const raw = pnlInputs[t.id] ?? "";
    const pnl = parseFloat(raw);
    if (!isFinite(pnl)) {
      alert("PnL inválido");
      return;
    }
    await closeTrade(uid, t.id, pnl);
    setPnlInputs((m) => ({ ...m, [t.id]: "" }));
  };

  const doEdit = async (t: Trade) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert("Sessão expirada. Faz login novamente.");
      return;
    }
    const symbol = prompt("Símbolo:", t.symbol) || t.symbol;
    const side = (prompt("Lado (LONG/SHORT):", t.side) || t.side) as any;
    const riskPct = parseFloat(
      prompt("Risco %:", String(t.riskPct)) || String(t.riskPct)
    );
    const fees = parseFloat(prompt("Taxa (fees):", String(t.fees)) || String(t.fees));
    const sizeUsd = parseFloat(
      prompt("Tamanho USD:", String(t.sizeUsd)) || String(t.sizeUsd)
    );
    const status = (prompt("Status (open/closed):", t.status) || t.status) as any;
    const note = prompt("Notas:", t.note || "") || "";

    const rec = (t.balanceBefore || 0) * typeFactor(t.tType);
    const next: Trade = {
      ...t,
      symbol,
      side,
      riskPct,
      fees,
      sizeUsd,
      status,
      note,
      recommended: rec,
      oversized: sizeUsd > rec,
    };

    if (status === "closed") {
      const pnl = parseFloat(
        prompt("PnL (USD):", String(t.pnl ?? 0)) || String(t.pnl ?? 0)
      );
      next.pnl = pnl;
      next.closedAt = t.closedAt || Date.now();
    } else {
      next.pnl = null;
      next.closedAt = null;
    }

    await editTrade(uid, next);
  };

  const doDelete = async (tradeId: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert("Sessão expirada. Faz login novamente.");
      return;
    }
    try {
      setBusyDelete(true);
      await deleteTrade(uid, tradeId);
      setConfirmId(null);
    } finally {
      setBusyDelete(false);
    }
  };

  const badgeSide = (side?: string) => {
    const isLong = (side || "").toUpperCase() === "LONG";
    const color = isLong ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400";
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
        {side || "—"}
      </span>
    );
  };

  const badgeStatus = (status?: string) => {
    const ok = status === "closed";
    const color = ok ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400";
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold">Últimas Trades</h3>

        <div className="flex items-center gap-2">
          <button
            className="btn-ghost"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            aria-label="Página anterior"
          >
            «
          </button>
          <div className="small">
            Página <b>{totalPages === 0 ? 0 : page + 1}</b> de <b>{totalPages}</b>
          </div>
          <button
            className="btn-ghost"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            aria-label="Próxima página"
          >
            »
          </button>
        </div>
      </div>

      {/* Wrapper com scroll horizontal se necessário */}
      <div className="overflow-x-auto">
        <table className="table min-w-full">
          <thead>
            <tr className="text-left whitespace-nowrap">
              {/* Datas ocultas em mobile */}
              <th className="hidden md:table-cell">Aberta</th>
              <th className="hidden md:table-cell">Fechada</th>

              <th>Symbol</th>

              {/* Lado oculto em mobile */}
              <th className="hidden md:table-cell">Lado</th>

              <th>Risco%</th>

              {/* Taxa oculta em mobile */}
              <th className="hidden md:table-cell">Taxa</th>

              <th>Tamanho USD</th>

              {/* Status e Ação ocultos em mobile */}
              <th className="hidden md:table-cell">Status</th>
              <th>Resultado</th>
              <th className="hidden md:table-cell">Ação</th>
            </tr>
          </thead>

          <tbody>
            {pageTrades.map((t) => {
              const rec = (t.balanceBefore || 0) * typeFactor(t.tType);
              const oversized = (t.sizeUsd || 0) > rec;
              const isOpen = t.status === "open";
              const isExpanded = !!expanded[t.id];

              return (
                <React.Fragment key={t.id}>
                  <tr
                    className={`align-middle ${
                      oversized ? "outline outline-2 outline-danger/50" : ""
                    }`}
                  >
                    {/* Datas (hidden em mobile) */}
                    <td className="small hidden md:table-cell">
                      {new Date(t.openAt).toLocaleString("pt-PT")}
                    </td>
                    <td className="small hidden md:table-cell">
                      {t.closedAt ? new Date(t.closedAt).toLocaleString("pt-PT") : "—"}
                    </td>

                    {/* Symbol (visível em mobile) + caret de expansão (só mobile) */}
                    <td className="font-semibold">
                      <div className="flex items-center gap-2">
                        <button
                          className="md:hidden btn-ghost p-1 rounded-lg"
                          onClick={() => toggleExpand(t.id)}
                          aria-expanded={isExpanded}
                          aria-controls={`mobile-row-${t.id}`}
                          title={isExpanded ? "Esconder detalhes" : "Mostrar detalhes"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        <span>{t.symbol}</span>
                      </div>
                    </td>

                    {/* Lado (hidden md-) */}
                    <td className="hidden md:table-cell">{badgeSide(t.side)}</td>

                    {/* Risco% */}
                    <td className="whitespace-nowrap">{t.riskPct}%</td>

                    {/* Taxa (hidden em mobile) */}
                    <td className="hidden md:table-cell whitespace-nowrap">
                      {(t.fees || 0).toFixed(2)}
                    </td>

                    {/* Tamanho USD com aviso */}
                    <td className="whitespace-nowrap">
                      ${((t.sizeUsd || 0) as number).toFixed(2)}
                      {oversized && (
                        <span
                          title={`Acima do recomendado (${rec.toFixed(2)})`}
                          className="ml-1 text-danger font-extrabold"
                          aria-label="Tamanho acima do recomendado"
                        >
                          ⚠
                        </span>
                      )}
                    </td>

                    {/* Status (hidden em mobile) */}
                    <td className="hidden md:table-cell">{badgeStatus(t.status)}</td>

                    {/* Resultado */}
                    <td
                      className={`whitespace-nowrap ${
                        t.status === "closed"
                          ? (t.pnl || 0) >= 0
                            ? "text-ok"
                            : "text-danger"
                          : "text-sub"
                      }`}
                    >
                      {t.status === "closed" ? (t.pnl || 0).toFixed(2) : "—"}
                    </td>

                    {/* Ação (hidden em mobile) */}
                    <td className="hidden md:table-cell">
                      {isOpen ? (
                        <div className="flex items-center gap-2">
                          <input
                            className="input w-28"
                            placeholder="PnL (USD)"
                            inputMode="decimal"
                            value={pnlInputs[t.id] ?? ""}
                            onChange={(e) =>
                              setPnlInputs((m) => ({ ...m, [t.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") doClose(t);
                            }}
                            aria-label={`PnL para fechar trade ${t.symbol}`}
                          />
                          <button className="btn" onClick={() => doClose(t)}>
                            Fechar
                          </button>
                          <button
                            className="btn-ghost"
                            onClick={() => doEdit(t)}
                            title="Editar"
                            aria-label={`Editar trade ${t.symbol}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            className="btn-ghost text-rose-300 hover:text-rose-200"
                            onClick={() => setConfirmId(t.id)}
                            title="Eliminar"
                            aria-label={`Eliminar trade ${t.symbol}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="small">R: {(t.r ?? 0).toFixed(2)}</span>
                          <button
                            className="btn-ghost"
                            onClick={() => doEdit(t)}
                            title="Editar"
                            aria-label={`Editar trade ${t.symbol}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            className="btn-ghost text-rose-300 hover:text-rose-200"
                            onClick={() => setConfirmId(t.id)}
                            title="Eliminar"
                            aria-label={`Eliminar trade ${t.symbol}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* MOBILE: linha de detalhes/ações (só visível em md:hidden) */}
                  <tr id={`mobile-row-${t.id}`} className="md:hidden">
                    <td colSpan={12} className="p-0">
                      {isExpanded && (
                        <div className="px-3 pb-3">
                          <div className="rounded-xl border border-line bg-muted/40 p-3 flex flex-col gap-2">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <div className="text-sub">Lado</div>
                                <div>{badgeSide(t.side)}</div>
                              </div>
                              <div>
                                <div className="text-sub">Status</div>
                                <div>{badgeStatus(t.status)}</div>
                              </div>
                              <div>
                                <div className="text-sub">Aberta</div>
                                <div className="small">
                                  {new Date(t.openAt).toLocaleString("pt-PT")}
                                </div>
                              </div>
                              <div>
                                <div className="text-sub">Fechada</div>
                                <div className="small">
                                  {t.closedAt
                                    ? new Date(t.closedAt).toLocaleString("pt-PT")
                                    : "—"}
                                </div>
                              </div>
                              <div>
                                <div className="text-sub">Taxa</div>
                                <div>{(t.fees || 0).toFixed(2)}</div>
                              </div>
                              <div>
                                <div className="text-sub">Risco</div>
                                <div>{t.riskPct}%</div>
                              </div>
                            </div>

                            {/* Ações em mobile */}
                            {isOpen ? (
                              <div className="flex items-center gap-2">
                                <input
                                  className="input flex-1"
                                  placeholder="PnL (USD)"
                                  inputMode="decimal"
                                  value={pnlInputs[t.id] ?? ""}
                                  onChange={(e) =>
                                    setPnlInputs((m) => ({ ...m, [t.id]: e.target.value }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") doClose(t);
                                  }}
                                  aria-label={`PnL para fechar trade ${t.symbol}`}
                                />
                                <button className="btn" onClick={() => doClose(t)}>
                                  Fechar
                                </button>
                                <button
                                  className="btn-ghost"
                                  onClick={() => doEdit(t)}
                                  title="Editar"
                                  aria-label={`Editar trade ${t.symbol}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  className="btn-ghost text-rose-300 hover:text-rose-200"
                                  onClick={() => setConfirmId(t.id)}
                                  title="Eliminar"
                                  aria-label={`Eliminar trade ${t.symbol}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="small">
                                  R: {(t.r ?? 0).toFixed(2)}
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    className="btn-ghost"
                                    onClick={() => doEdit(t)}
                                    title="Editar"
                                    aria-label={`Editar trade ${t.symbol}`}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="btn-ghost text-rose-300 hover:text-rose-200"
                                    onClick={() => setConfirmId(t.id)}
                                    title="Eliminar"
                                    aria-label={`Eliminar trade ${t.symbol}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}

            {pageTrades.length === 0 && (
              <tr>
                <td className="small" colSpan={12}>
                  Sem trades nesta página.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dica UX para mobile */}
      <div className="mt-2 small text-sub md:hidden">
        * Toca no símbolo para ver detalhes, fechar, editar ou eliminar a trade.
      </div>

      {/* Modal de confirmação de eliminação */}
      {confirmId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-neutral-900/95 ring-1 ring-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">Eliminar trade</h4>
              <button className="btn-ghost p-1" onClick={() => setConfirmId(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm opacity-80">
              Tens a certeza que queres eliminar esta trade? Se já estava fechada, o saldo será
              ajustado e o PnL removido.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-lg px-3 py-1.5 bg-white/5 hover:bg-white/10 ring-1 ring-white/10 text-sm"
                onClick={() => setConfirmId(null)}
                disabled={busyDelete}
              >
                Cancelar
              </button>
              <button
                className="rounded-lg px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white text-sm disabled:opacity-60"
                onClick={() => doDelete(confirmId)}
                disabled={busyDelete}
              >
                {busyDelete ? "A eliminar…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
