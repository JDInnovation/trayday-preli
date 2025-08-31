"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, X, Info } from "lucide-react";
import { fmtMoney, monthLabel, ymd } from "@/lib/utils";
import type { Trade } from "@/lib/types";
import { useRouter } from "next/navigation";

type DayInfo = {
  key: string;          // YYYY-MM-DD
  date: Date;
  pnl: number;          // PnL de trades FECHADAS do dia
  trades: number;       // total trades (abertas+fechadas) no dia
  hasTrades: boolean;
  dd: number;           // drawdown cumulativo (se vieres a usar)
  pctCumul: number;     // % acumulada até ao dia
  isToday: boolean;
  openEq: number;
  closeEq: number;
  highEq: number;
  lowEq: number;
};

export default function CalendarMonth({
  y,
  m,
  daily,
  tradesByDay,
  currency,
  onPrev,
  onNext,
  onPickMonth,
  onAnnual,
}: {
  y: number;
  m: number;
  daily: DayInfo[];
  tradesByDay: Record<string, Trade[]>;
  currency: string;
  onPrev: () => void;
  onNext: () => void;
  onPickMonth: (y: number, m: number) => void;
  onAnnual: () => void;
}) {
  const router = useRouter();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [mobileDay, setMobileDay] = useState<DayInfo | null>(null);

  // Responsividade simples
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    fn();
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  // Dia -> trades + totais
  const dayMap = useMemo(() => {
    const map: Record<string, { pnl: number; trades: number; list: Trade[] }> = {};
    for (const d of daily) {
      const list = tradesByDay[d.key] || [];
      const closed = list.filter((t) => t.status === "closed");
      const pnl = closed.reduce((a, t) => a + (t.pnl || 0), 0);
      map[d.key] = { pnl, trades: list.length, list };
    }
    return map;
  }, [daily, tradesByDay]);

  // Navegação do mês
  const title = `${monthLabel(y, m)} ${y}`;

  // Ação do "+" — em mobile e desktop: leva ao registo com data do dia
  const goAddTradeForDay = (key: string) => {
    router.push(`/dashboard?day=${key}#records`);
  };

  // Cabeçalho do calendário
  const WeekHeader = () => (
    <div className="grid grid-cols-7 text-xs uppercase tracking-wide opacity-70 px-1">
      {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
        <div key={d} className="p-2 text-center">{d}</div>
      ))}
    </div>
  );

  // Grelha de dias
  const Grid = () => {
    const first = new Date(y, m, 1);
    const firstWeekday = (first.getDay() + 6) % 7; // segunda=0
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: Array<{ date: Date | null; key?: string }> = [];

    for (let i = 0; i < firstWeekday; i++) cells.push({ date: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d);
      const key = ymd(date);
      cells.push({ date, key });
    }
    // completa última semana
    while (cells.length % 7 !== 0) cells.push({ date: null });

    return (
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, idx) => {
          if (!c.date) {
            return <div key={idx} className="h-24 rounded-lg bg-neutral-800/30" />;
          }
          const key = c.key!;
          const d = daily.find((x) => x.key === key)!;
          const meta = dayMap[key] || { pnl: 0, trades: 0, list: [] };
          const isPast = c.date.getTime() < new Date(new Date().toDateString()).getTime();
          const color =
            meta.trades > 0
              ? meta.pnl >= 0
                ? "ring-emerald-500/40 bg-emerald-500/10"
                : "ring-rose-500/40 bg-rose-500/10"
              : "bg-neutral-800/30 opacity-70"; // dias sem registos a cinza

          const content = (
            <div className={`rounded-xl p-2 ring-1 ${color} hover:opacity-100 transition`}>
              <div className="flex items-center justify-between gap-2">
                <div className={`text-sm ${d.isToday ? "font-bold" : "opacity-80"}`}>
                  {c.date.getDate()}
                </div>
                {/* botão + para dias passados */}
                {isPast && (
                  <button
                    className="icon-btn !p-1 opacity-80 hover:opacity-100"
                    title="Adicionar trade neste dia"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      if (isMobile) {
                        setMobileDay(d);
                      } else {
                        goAddTradeForDay(key);
                      }
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* linhas compactas (cada parâmetro na sua linha) */}
              <div className="mt-1 space-y-0.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="opacity-70">Trades</span>
                  <span className="font-medium">{meta.trades}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="opacity-70">PnL</span>
                  <span className={`font-semibold ${meta.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {fmtMoney(meta.pnl, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="opacity-70">% acum.</span>
                  <span className="font-medium">{d.pctCumul.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          );

          // Interação
          const onClick = () => {
            if (isMobile) {
              setMobileDay(d);
            } else {
              setExpandedKey((cur) => (cur === key ? null : key));
              // opcional: rolar o painel expandido para vista
              setTimeout(() => {
                const el = document.getElementById("cal-expanded-panel");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 0);
            }
          };

          return (
            <div key={key}>
              <button className="w-full text-left" onClick={onClick}>
                {content}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  // dados do painel expandido (desktop)
  const selectedDay = expandedKey ? daily.find((x) => x.key === expandedKey) || null : null;
  const selectedMeta = expandedKey ? dayMap[expandedKey || ""] : null;

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <button className="icon-btn" onClick={onPrev} title="Mês anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
        <div className="font-semibold">{title}</div>
          <button className="icon-btn" onClick={onNext} title="Mês seguinte">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="chip" onClick={onAnnual}>
            <Info className="w-4 h-4" />
            <span>Vista anual</span>
          </button>
        </div>
      </div>

      <WeekHeader />
      <Grid />

      {/* Painel expandido LARGO (desktop) */}
      {!isMobile && selectedDay && selectedMeta && (
        <div id="cal-expanded-panel" className="mt-3 rounded-2xl bg-neutral-900/95 ring-1 ring-white/10 p-4 shadow-2xl">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-sm opacity-80">{selectedDay.date.toLocaleDateString()}</div>
            <div className="flex items-center gap-2">
              <button
                className="chip"
                onClick={() => goAddTradeForDay(selectedDay.key)}
                title="Adicionar trade neste dia"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar trade</span>
              </button>
              <button className="icon-btn" onClick={() => setExpandedKey(null)} title="Fechar">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Layout mais organizado: métricas à esquerda + lista à direita (em ecrãs grandes) */}
          <div className="grid lg:grid-cols-3 gap-3">
            {/* Métricas do dia */}
            <div className="lg:col-span-1 space-y-2">
              <MetricRow label="Trades" value={`${selectedMeta.trades}`} />
              <MetricRow
                label="PnL do dia"
                value={fmtMoney(selectedMeta.pnl, currency)}
                tone={selectedMeta.pnl >= 0 ? "pos" : "neg"}
                icon={selectedMeta.pnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              />
              <MetricRow label="% acumulada" value={`${selectedDay.pctCumul.toFixed(2)}%`} />
              <MetricRow label="Equity (abertura)" value={fmtMoney(selectedDay.openEq || 0, currency)} />
              <MetricRow label="Equity (máx.)" value={fmtMoney(selectedDay.highEq || 0, currency)} />
              <MetricRow label="Equity (mín.)" value={fmtMoney(selectedDay.lowEq || 0, currency)} />
              <MetricRow label="Equity (fecho)" value={fmtMoney(selectedDay.closeEq || 0, currency)} />
            </div>

            {/* Lista de trades */}
            <div className="lg:col-span-2">
              <div className="rounded-xl bg-neutral-800/50 ring-1 ring-white/10 p-2 max-h-72 overflow-auto">
                {selectedMeta.list.length === 0 ? (
                  <div className="small opacity-70">Sem registos para este dia.</div>
                ) : (
                  <div className="space-y-1">
                    {selectedMeta.list.map((t) => (
                      <TradeRow key={t.id} t={t} currency={currency} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal mobile */}
      {mobileDay && (
        <MobileDayModal
          day={mobileDay}
          trades={dayMap[mobileDay.key]?.list || []}
          pnl={dayMap[mobileDay.key]?.pnl || 0}
          currency={currency}
          canAdd={mobileDay.date.getTime() < new Date(new Date().toDateString()).getTime()}
          onAdd={() => {
            goAddTradeForDay(mobileDay.key);
            setMobileDay(null);
          }}
          onClose={() => setMobileDay(null)}
        />
      )}
    </div>
  );
}

/* ---------- Sub-componentes ---------- */

function MetricRow({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
  icon?: React.ReactNode;
}) {
  const toneCls = tone === "pos" ? "text-emerald-400" : tone === "neg" ? "text-rose-400" : "text-white";
  return (
    <div className="flex items-center justify-between rounded-lg bg-neutral-800/40 ring-1 ring-white/10 px-3 py-2">
      <div className="small opacity-80">{label}</div>
      <div className={`flex items-center gap-2 font-semibold ${toneCls}`}>
        {icon}
        <span>{value}</span>
      </div>
    </div>
  );
}

function ExpandedDay({
  date,
  list,
  pnl,
  currency,
  onAdd,
  onClose,
}: {
  date: Date;
  list: Trade[];
  pnl: number;
  currency: string;
  onAdd: () => void;
  onClose: () => void;
}) {
  // (não usado agora — mantido se quiseres reutilizar)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm opacity-80">
          {date.toLocaleDateString()}
        </div>
        <div className="flex items-center gap-2">
          <button className="chip" onClick={onAdd} title="Adicionar trade neste dia">
            <Plus className="w-4 h-4" />
            <span>Adicionar trade</span>
          </button>
          <button className="icon-btn" onClick={onClose} title="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <DaySummary pnl={pnl} currency={currency} />

      <div className="space-y-1 max-h-60 overflow-auto pr-1">
        {list.length === 0 ? (
          <div className="small opacity-70">Sem registos para este dia.</div>
        ) : (
          list.map((t) => <TradeRow key={t.id} t={t} currency={currency} />)
        )}
      </div>
    </div>
  );
}

function MobileDayModal({
  day,
  trades,
  pnl,
  currency,
  canAdd,
  onAdd,
  onClose,
}: {
  day: { date: Date; key: string };
  trades: Trade[];
  pnl: number;
  currency: string;
  canAdd: boolean;
  onAdd: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:w-[560px] max-h-[80vh] overflow-auto rounded-t-2xl sm:rounded-2xl bg-neutral-900 ring-1 ring-white/10 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">{day.date.toLocaleDateString()}</div>
          <button className="icon-btn" onClick={onClose} title="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <DaySummary pnl={pnl} currency={currency} />

        <div className="mt-2 space-y-1">
          {trades.length === 0 ? (
            <div className="small opacity-70">Sem registos para este dia.</div>
          ) : (
            trades.map((t) => <TradeRow key={t.id} t={t} currency={currency} />)
          )}
        </div>

        {canAdd && (
          <div className="mt-3">
            <button className="btn w-full" onClick={onAdd}>
              <Plus className="w-4 h-4" />
              <span>Adicionar trade neste dia</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DaySummary({ pnl, currency }: { pnl: number; currency: string }) {
  const PosIcon = pnl >= 0 ? TrendingUp : TrendingDown;
  return (
    <div className="flex items-center justify-between rounded-xl bg-neutral-800/60 ring-1 ring-white/10 px-3 py-2">
      <div className="small opacity-80">Resumo do dia</div>
      <div className={`flex items-center gap-2 font-semibold ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
        <PosIcon className="w-4 h-4" />
        <span>{fmtMoney(pnl, currency)}</span>
      </div>
    </div>
  );
}

function sideBadge(side?: string) {
  if (!side) return null;
  const cls =
    side.toLowerCase() === "long"
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
      : "bg-rose-500/15 text-rose-300 ring-rose-500/30";
  return <span className={`px-1.5 py-0.5 rounded-md ring-1 text-[10px] uppercase tracking-wide ${cls}`}>{side}</span>;
}

function TradeRow({ t, currency }: { t: Trade; currency: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-neutral-800/40 ring-1 ring-white/10 px-2 py-1.5">
      <div className="flex items-center gap-2">
        {sideBadge(t.side as any)}
        <div className="text-sm font-medium">{t.symbol || t.ticker || "—"}</div>
      </div>
      <div className={`text-sm font-semibold ${((t.pnl || 0) >= 0) ? "text-emerald-400" : "text-rose-400"}`}>
        {t.status === "closed" ? fmtMoney(t.pnl || 0, currency) : "Aberta"}
      </div>
    </div>
  );
}
