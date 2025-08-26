"use client";

import { Trade } from "@/lib/types";
import { useMemo, useState } from "react";
import { closeTrade, editTrade } from "@/lib/firestore";
import { auth } from "@/lib/firebase.client";
import { typeFactor } from "@/lib/utils";
import { Pencil, ChevronDown, ChevronRight } from "lucide-react";

const PAGE_SIZE = 10;

export default function TradesTable({ trades }: { trades: Trade[] }) {
  const [page, setPage] = useState(0);
  const [pnlInputs, setPnlInputs] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({}); // mobile: detalhes por linha

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
        <h3 className="font-bold">Trades — últimas</h3>

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
                <>
                  <tr
                    key={t.id}
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
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="small">
                                  R: {(t.r ?? 0).toFixed(2)}
                                </span>
                                <button
                                  className="btn-ghost"
                                  onClick={() => doEdit(t)}
                                  title="Editar"
                                  aria-label={`Editar trade ${t.symbol}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                </>
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
        * Toca no símbolo para ver detalhes e ações (fechar/editar) desta trade.
      </div>
    </div>
  );
}
