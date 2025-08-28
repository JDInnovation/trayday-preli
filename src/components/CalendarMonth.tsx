"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MonthAggDay, Trade } from "@/lib/types";
import { pad2, ymd } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Activity,
  X,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const DayPnlSparkline = dynamic(
  () => import("@/components/charts/DayPnlSparkline"),
  { ssr: false }
);

export default function CalendarMonth({
  y,
  m,
  daily,
  tradesByDay, // mapa dia -> trades
  currency,
  onPrev,
  onNext,
  onPickMonth,
  onAnnual,
}: {
  y: number;
  m: number;
  daily: MonthAggDay[];
  tradesByDay: Record<string, Trade[]>;
  currency: string;
  onPrev: () => void;
  onNext: () => void;
  onPickMonth: (y: number, m: number) => void;
  onAnnual: () => void;
}) {
  const labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const mv = `${y}-${pad2(m + 1)}`;
  const s = new Date(y, m, 1);
  // Começa a semana na 2ª feira
  const startOffset = (s.getDay() + 6) % 7;

  const blanks = useMemo(
    () => Array.from({ length: startOffset }, (_, i) => <div key={`b-${i}`} />),
    [startOffset]
  );

  // Expansão de dia (apenas um aberto)
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const toggle = (key: string) =>
    setExpandedKey((k) => (k === key ? null : key));

  // Pop-up do gráfico diário (desktop-only)
  const [chartForKey, setChartForKey] = useState<string | null>(null);
  const closeChart = () => setChartForKey(null);

  // ESC fecha o pop-up
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeChart();
    };
    if (chartForKey) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chartForKey]);

  const fmtMoney = (v: number) =>
    v.toLocaleString(undefined, { style: "currency", currency });

  const sideBadge = (side?: string) => {
    const isLong = (side || "").toUpperCase() === "LONG";
    const cls = isLong
      ? "bg-emerald-500/15 text-emerald-400"
      : "bg-red-500/15 text-red-400";
    return (
      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
        {side || "—"}
      </span>
    );
  };

  return (
    <div className="card" id="calendarCard">
      {/* Header de navegação */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-ghost" onClick={onPrev} aria-label="Mês anterior">
            «
          </button>
          <input
            className="input"
            type="month"
            value={mv}
            onChange={(e) => {
              const [yy, mm] = e.target.value.split("-").map((v) => parseInt(v, 10));
              onPickMonth(yy, mm - 1);
            }}
            aria-label="Selecionar mês"
          />
          <button className="btn-ghost" onClick={onNext} aria-label="Mês seguinte">
            »
          </button>
          <span className="small text-sub">
            Legenda: Δ% cumul = % vs. início • #trades = número de ordens do dia
          </span>
        </div>
        <div>
          <button className="btn" onClick={onAnnual}>
            Performance anual
          </button>
        </div>
      </div>

      {/* Cabeçalhos dos dias da semana */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-2 min-w-[700px] mb-1">
          {labels.map((l) => (
            <div key={l} className="text-center text-sub text-xs">
              {l}
            </div>
          ))}
        </div>

        {/* Grelha de dias */}
        <div className="grid grid-cols-7 gap-3 min-w-[700px]">
          {blanks}
          {daily.map((d) => {
            const posNeg =
              d.pnl > 0
                ? "outline outline-1 outline-ok/40"
                : d.pnl < 0
                ? "outline outline-1 outline-danger/40"
                : "";
            const tileCls = [
              "group border border-line rounded-xl p-2 md:p-3 bg-[#0f172a]",
              "transition-colors hover:bg-slate-800/40 focus-within:ring-1 focus-within:ring-brand",
              "min-h-[120px] flex flex-col gap-1",
              d.hasTrades ? posNeg : "opacity-70",
              d.isToday ? "ring-2 ring-brand" : "",
            ].join(" ");

            const isOpen = expandedKey === d.key;

            // Série do gráfico do dia (acumulado por trade fechada)
            const spark = (() => {
              const trades = (tradesByDay[d.key] || [])
                .filter((t) => t.status === "closed" && ymd(new Date(t.closedAt!)) === d.key)
                .sort((a, b) => a.closedAt! - b.closedAt!);
              let acc = 0;
              const arr = [{ idx: "0", v: 0 }];
              trades.forEach((t, i) => {
                acc += t.pnl || 0;
                arr.push({ idx: String(i + 1), v: acc });
              });
              if (arr.length === 1) arr.push({ idx: "1", v: 0 });
              return arr;
            })();

            // trades do dia (compacto)
            const tradesList = (tradesByDay[d.key] || [])
              .filter((t) => t.status === "closed" && ymd(new Date(t.closedAt!)) === d.key)
              .sort((a, b) => a.closedAt! - b.closedAt!)
              .slice(0, 5);

            return (
              <>
                {/* TILE do dia */}
                <div key={d.key} className={tileCls}>
                  {/* Cabeçalho do dia + ações */}
                  <button
                    className="flex items-center justify-between w-full text-left"
                    onClick={() => toggle(d.key)}
                    aria-expanded={isOpen}
                    aria-controls={`day-panel-${d.key}`}
                    title={isOpen ? "Esconder detalhes" : "Ver detalhes"}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-300 text-sm md:text-base">
                        {d.date.getDate()}
                      </span>
                      {/* Badge #trades (compacto) */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          d.trades > 0
                            ? "bg-slate-500/10 text-slate-300"
                            : "bg-slate-500/5 text-slate-400"
                        }`}
                      >
                        {d.trades} {d.trades === 1 ? "trade" : "trades"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* PnL do dia */}
                      <span
                        className={`text-xs md:text-sm ${
                          d.pnl >= 0 ? "text-ok" : d.pnl < 0 ? "text-danger" : "text-sub"
                        }`}
                      >
                        {d.hasTrades ? d.pnl.toFixed(2) : "—"}
                      </span>
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-sub" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-sub" />
                      )}
                    </div>
                  </button>

                  {/* Linha Δ% acumulado (sempre visível) */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="small text-sub">Δ% cumul</span>
                    <span
                      className={`small font-semibold ${
                        d.pctCumul >= 0 ? "text-ok" : "text-danger"
                      }`}
                    >
                      {d.hasTrades ? `${d.pctCumul.toFixed(2)}%` : "—"}
                    </span>
                  </div>

                  {/* Painel expandido inline (apenas MOBILE) */}
                  {isOpen && (
                    <div
                      id={`day-panel-${d.key}`}
                      className="mt-2 rounded-lg border border-line/70 bg-muted/40 p-2 md:hidden"
                    >
                      <InlinePanel
                        d={d}
                        tradesList={tradesList}
                        onOpenChart={() => setChartForKey(d.key)}
                        currency={currency}
                        sideBadge={sideBadge}
                        fmtMoney={fmtMoney}
                      />
                    </div>
                  )}
                </div>

                {/* Painel expandido FULL-WIDTH (apenas DESKTOP) */}
                {isOpen && (
                  <div
                    key={`${d.key}-full`}
                    className="hidden md:block col-span-7 col-start-1"
                  >
                    <div className="rounded-xl border border-line bg-muted/40 p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-semibold">
                          {new Date(d.key).toLocaleDateString("pt-PT", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "2-digit",
                          })}
                        </div>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800/60 text-sub"
                          title="Ver gráfico do dia"
                          onClick={() => setChartForKey(d.key)}
                        >
                          <Activity className="w-4 h-4" />
                          <span className="text-xs">gráfico</span>
                        </button>
                      </div>

                      {/* GRID 2 colunas em desktop */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Coluna esquerda: métricas */}
                        <div className="flex flex-col gap-2">
                          <div className="rounded-lg border border-line bg-slate-900/40 p-3">
                            <div className="text-sub text-xs mb-1">Equity</div>
                            <div className="flex items-center gap-2 font-medium">
                              <span>{fmtMoney(d.openEq)}</span>
                              <ArrowRight className="w-4 h-4 text-sub" />
                              <span>{fmtMoney(d.closeEq)}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <KpiChip
                              label="PnL do dia"
                              value={fmtMoney(d.pnl)}
                              positive={d.pnl >= 0}
                            />
                            <KpiChip
                              label="Δ% acumul"
                              value={`${d.pctCumul.toFixed(2)}%`}
                              positive={d.pctCumul >= 0}
                            />
                            <KpiChip
                              label="Drawdown (cum.)"
                              value={fmtMoney(d.dd)}
                              positive={false}
                              danger
                            />
                            <KpiChip label="# de trades" value={`${d.trades}`} />
                          </div>
                        </div>

                        {/* Coluna direita: lista de trades */}
                        <div className="rounded-lg border border-line bg-slate-900/40 p-2">
                          <div className="text-sub text-xs mb-2">
                            Trades do dia (fechadas)
                          </div>
                          {tradesList.length === 0 ? (
                            <div className="small text-sub">Sem trades fechadas.</div>
                          ) : (
                            <ul className="flex flex-col gap-1">
                              {tradesList.map((t) => {
                                const pn = t.pnl || 0;
                                const pos = pn >= 0;
                                return (
                                  <li
                                    key={t.id}
                                    className="flex items-center justify-between gap-2 text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      {sideBadge(t.side)}
                                      <span className="font-medium">{t.symbol}</span>
                                      <span className="text-sub text-xs">
                                        {new Date(t.closedAt!).toLocaleTimeString("pt-PT", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>
                                    <div
                                      className={`font-semibold ${
                                        pos ? "text-ok" : "text-danger"
                                      } flex items-center gap-1`}
                                    >
                                      {pos ? (
                                        <TrendingUp className="w-3.5 h-3.5" />
                                      ) : (
                                        <TrendingDown className="w-3.5 h-3.5" />
                                      )}
                                      {pn.toFixed(2)}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* POP-UP do gráfico diário (desktop only) */}
                {chartForKey === d.key && (
                  <div
                    className="hidden md:grid fixed inset-0 z-50 place-items-center p-4"
                    role="dialog"
                    aria-modal="true"
                  >
                    {/* backdrop */}
                    <div
                      className="absolute inset-0 bg-black/50"
                      onClick={closeChart}
                      aria-hidden="true"
                    />
                    {/* content */}
                    <div className="relative max-w-xl w-full card">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">
                          PnL do dia — {new Date(d.key).toLocaleDateString("pt-PT")}
                        </h4>
                        <button
                          className="btn-ghost"
                          onClick={closeChart}
                          aria-label="Fechar"
                          title="Fechar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <DayPnlSparkline data={spark} currency={currency} />
                      <div className="text-sub small mt-2">
                        Acumulado por trade fechada nesse dia (inicia em 0).
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Chip de KPI reutilizável */
function KpiChip({
  label,
  value,
  positive,
  danger,
}: {
  label: string;
  value: string;
  positive?: boolean;
  danger?: boolean;
}) {
  const color = danger ? "text-danger" : positive === undefined ? "text-slate-200" : positive ? "text-ok" : "text-danger";
  return (
    <div className="rounded-lg border border-line bg-slate-900/40 p-2">
      <div className="text-sub text-[11px]">{label}</div>
      <div className={`font-semibold ${color}`}>{value}</div>
    </div>
  );
}

/** Painel inline (mobile) com o mesmo conteúdo, compacto */
function InlinePanel({
  d,
  tradesList,
  onOpenChart,
  currency,
  sideBadge,
  fmtMoney,
}: {
  d: MonthAggDay;
  tradesList: Trade[];
  onOpenChart: () => void;
  currency: string;
  sideBadge: (side?: string) => JSX.Element;
  fmtMoney: (v: number) => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-sub text-xs">Equity</div>
        <button
          type="button"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800/60 text-sub"
          title="Ver gráfico do dia"
          onClick={(e) => {
            e.stopPropagation();
            onOpenChart();
          }}
        >
          <Activity className="w-4 h-4" />
          <span className="text-xs">gráfico</span>
        </button>
      </div>
      <div className="flex items-center gap-2 font-medium">
        <span>{fmtMoney(d.openEq)}</span>
        <ArrowRight className="w-4 h-4 text-sub" />
        <span>{fmtMoney(d.closeEq)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <KpiChip label="PnL do dia" value={fmtMoney(d.pnl)} positive={d.pnl >= 0} />
        <KpiChip label="Δ% acumul" value={`${d.pctCumul.toFixed(2)}%`} positive={d.pctCumul >= 0} />
        <KpiChip label="Drawdown (cum.)" value={fmtMoney(d.dd)} danger />
        <KpiChip label="# de trades" value={`${d.trades}`} />
      </div>

      <div className="rounded-lg border border-line bg-slate-900/40 p-2">
        <div className="text-sub text-xs mb-2">Trades do dia (fechadas)</div>
        {tradesList.length === 0 ? (
          <div className="small text-sub">Sem trades fechadas.</div>
        ) : (
          <ul className="flex flex-col gap-1">
            {tradesList.map((t) => {
              const pn = t.pnl || 0;
              const pos = pn >= 0;
              return (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    {sideBadge(t.side)}
                    <span className="font-medium">{t.symbol}</span>
                    <span className="text-sub text-xs">
                      {new Date(t.closedAt!).toLocaleTimeString("pt-PT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className={`font-semibold ${pos ? "text-ok" : "text-danger"}`}>
                    {pn.toFixed(2)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
