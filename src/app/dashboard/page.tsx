"use client";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import AuthGate from "@/components/AuthGate";
import HeaderBar from "@/components/HeaderBar";
import OrderForm from "@/components/OrderForm";
import CashflowsCard from "@/components/CashflowsCard";
import TradesTable from "@/components/TradesTable";
import CalendarMonth from "@/components/CalendarMonth";
import MonthSummary from "@/components/MonthSummary";
import PayoutCard from "@/components/PayoutCard";
import ExportsCard from "@/components/ExportsCard";
import PnlMonthLine from "@/components/charts/PnlMonthLine";
import WinLossDonut from "@/components/charts/WinLossDonut";
import SessionCandles from "@/components/charts/SessionCandles";
import DailyBars from "@/components/charts/DailyBars";
import TradeCandles from "@/components/charts/TradeCandles";
import DailyPctLine from "@/components/charts/DailyPctLine";

import PrivacyProvider from "@/components/PrivacyProvider";
import BalanceChip from "@/components/BalanceChip";
import TodayPulse from "@/components/TodayPulse";
import RiskProgress from "@/components/RiskProgress";

import TimeframeSelector, { Timeframe } from "@/components/timeframe/TimeframeSelector";
import KpiGrid from "@/components/kpi/KpiGrid";
import { computeKPIs } from "@/lib/kpis";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase.client";
import { listenAllTrades, listenCashflows, listenUser, saveOnboarding } from "@/lib/firestore";
import { Cashflow, Trade, UserDoc } from "@/lib/types";
import { endOfMonth, monthLabel, startOfMonth, ymd, fmtMoney, daysInMonth } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

export default function DashboardPage() {
  return (
    <AuthGate>
      <PrivacyProvider>
        <DashboardInner />
      </PrivacyProvider>
    </AuthGate>
  );
}

function DashboardInner() {
  const [uid, setUid] = useState<string | null>(null);
  const [user, setUser] = useState<UserDoc | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [cashflows, setCashflows] = useState<Cashflow[]>([]);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const off = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => off();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const offU = listenUser(uid, (u) => {
      setUser(u);
      setNeedsOnboarding(!!u && (u.startingBalance == null || u.currentBalance == null));
    });
    const offT = listenAllTrades(uid, setTrades);
    const offC = listenCashflows(uid, setCashflows);
    return () => { offU(); offT(); offC(); };
  }, [uid]);

  if (!uid) return <div className="card">A iniciar sessão…</div>;
  if (!user) return <div className="card">A carregar…</div>;
  if (needsOnboarding) {
    return (
      <Onboarding
        currencyDefault={user.currency}
        onSave={async (val, cur) => {
          await saveOnboarding(uid!, val, cur);
          setNeedsOnboarding(false);
        }}
      />
    );
  }

  return <DashboardContent user={user} trades={trades} cashflows={cashflows} />;
}

function DashboardContent({
  user,
  trades,
  cashflows,
}: {
  user: UserDoc;
  trades: Trade[];
  cashflows: Cashflow[];
}) {
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth());
  const [annualMode, setAnnualMode] = useState(false);
  const [annualYear, setAnnualYear] = useState<number>(new Date().getFullYear());

  const s = startOfMonth(viewYear, viewMonth);
  const e = endOfMonth(viewYear, viewMonth);

  // --- Fechadas do mês (mantemos para resumos mensais/exports)
  const tradesClosedMonth = useMemo(
    () =>
      trades
        .filter(
          (t) =>
            t.status === "closed" &&
            t.closedAt! >= s.getTime() &&
            t.closedAt! <= e.getTime()
        )
        .sort((a, b) => a.closedAt! - b.closedAt!),
    [trades, s, e]
  );

  // Win/Loss do mês (para MonthSummary etc.)
  const wins = tradesClosedMonth.filter((t) => (t.pnl || 0) >= 0).length;
  const losses = tradesClosedMonth.length - wins;

  const totalDays = daysInMonth(viewYear, viewMonth);
  const byDay: Record<string, Trade[]> = useMemo(() => {
    const map: Record<string, Trade[]> = {};
    trades.forEach((t) => {
      const when = t.status === "closed" ? t.closedAt || t.openAt : t.openAt;
      const dkey = ymd(new Date(when));
      (map[dkey] ||= []).push(t);
    });
    return map;
  }, [trades]);

  let eq = user.startingBalance || 0,
    peak = eq,
    dd = 0;
  const daily = Array.from({ length: totalDays }, (_, i) => {
    const date = new Date(viewYear, viewMonth, i + 1);
    const key = ymd(date);
    const list = byDay[key] || [];
    const closed = list.filter((t) => t.status === "closed");
    const dayPnL = closed.reduce((a, t) => a + (t.pnl || 0), 0);
    const hasTrades = list.length > 0;
    eq += dayPnL;
    if (eq > peak) peak = eq;
    dd = eq - peak;
    const pctCumul =
      user.startingBalance! > 0
        ? ((eq - user.startingBalance!) / user.startingBalance!) * 100
        : 0;
    return {
      key,
      date,
      pnl: dayPnL,
      trades: list.length,
      hasTrades,
      dd,
      pctCumul,
      isToday: ymd(new Date()) === key,
      openEq: eq - dayPnL,
      closeEq: eq,
      highEq: Math.max(eq, eq - dayPnL),
      lowEq: Math.min(eq, eq - dayPnL),
    };
  });

  const monthPnL = tradesClosedMonth.reduce((a, t) => a + (t.pnl || 0), 0);
  const monthPct =
    user.startingBalance! > 0 ? (monthPnL / user.startingBalance!) * 100 : 0;
  const monthWinRate = tradesClosedMonth.length
    ? (wins / tradesClosedMonth.length) * 100
    : 0;
  const best = daily.filter((d) => d.hasTrades).sort((a, b) => b.pnl - a.pnl)[0];
  const worst = daily.filter((d) => d.hasTrades).sort((a, b) => a.pnl - b.pnl)[0];
  const totalTradesInMonth = daily.reduce((a, d) => a + d.trades, 0);

  const today = new Date();
  const isCurrent =
    today.getFullYear() === viewYear && today.getMonth() === viewMonth;
  const daysLeft = isCurrent
    ? Math.max(0, Math.ceil((e.getTime() - today.getTime()) / 86400000))
    : 0;

  const expenses =
    user.monthlyExpenses?.[
      `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`
    ] || 0;

  const growthPct =
    user.startingBalance! > 0
      ? ((user.currentBalance! - user.startingBalance!) / user.startingBalance!) * 100
      : 0;
  const maxPerTrade = 0.03 * (user.currentBalance || 0);
  const maxPerDay = 0.09 * (user.currentBalance || 0);
  const dayGoal = 0.15 * (user.currentBalance || 0);

  const months = Array.from({ length: 12 }, (_, m) => {
    const ms = startOfMonth(viewYear, m).getTime(),
      me = endOfMonth(viewYear, m).getTime();
    const list = trades.filter(
      (t) => t.status === "closed" && t.closedAt! >= ms && t.closedAt! <= me
    );
    const pnl = list.reduce((a, t) => a + (t.pnl || 0), 0);
    const wr = list.length
      ? (list.filter((t) => (t.pnl || 0) >= 0).length / list.length) * 100
      : 0;
    return { m, pnl, trades: list.length, winRate: wr };
  });

  const tradeCandles = useMemo(() => {
    let cum = 0;
    return tradesClosedMonth.map((t, i) => {
      const pnl = t.pnl || 0;
      const open = cum;
      const close = cum + pnl;
      const high = Math.max(open, close);
      const low = Math.min(open, close);
      cum = close;
      return {
        key: String(i + 1).padStart(2, "0"),
        pnl,
        open,
        close,
        high,
        low,
        date: t.closedAt!,
      };
    });
  }, [tradesClosedMonth]);

  const dailyPctLine = useMemo(
    () =>
      daily.map((d, i) => ({
        key: String(i + 1).padStart(2, "0"),
        v: d.pctCumul,
      })),
    [daily]
  );

  // ---------- TIMEFRAME + 10 KPIs ----------
  const [tf, setTf] = useState<Timeframe>(() => {
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);
    return { mode: "month", start, end, label: "" };
  });

  const { list: kpis, charts } = useMemo(
    () => computeKPIs(trades, cashflows, tf.start, tf.end, user.startingBalance || 0, user.currentBalance || 0),
    [trades, cashflows, tf, user.startingBalance, user.currentBalance]
  );

  // ---------- NOVO: ajustar os 2 gráficos ao timeframe ----------
  const tradesClosedTF = useMemo(
    () =>
      trades
        .filter(
          (t) =>
            t.status === "closed" &&
            t.closedAt != null &&
            t.closedAt >= tf.start.getTime() &&
            t.closedAt <= tf.end.getTime()
        )
        .sort((a, b) => a.closedAt! - b.closedAt!),
    [trades, tf]
  );

  const tfSeries = useMemo(() => {
    let sum = 0;
    const arr = [{ t: tf.start.getTime(), v: 0 }];
    for (const t of tradesClosedTF) {
      sum += t.pnl || 0;
      arr.push({ t: t.closedAt!, v: sum });
    }
    if (arr.length === 1) arr.push({ t: tf.start.getTime() + 1, v: 0 });
    return arr;
  }, [tradesClosedTF, tf]);

  const tfWins = useMemo(
    () => tradesClosedTF.filter((t) => (t.pnl || 0) >= 0).length,
    [tradesClosedTF]
  );
  const tfLosses = tradesClosedTF.length - tfWins;

  return (
    <div className="flex flex-col gap-4">
      <HeaderBar />

      {/* Faixa superior: 3 cards de altura igual (sem espaços) */}
      <div className="grid md:grid-cols-3 gap-3 items-stretch">
        <TodayPulse trades={trades} currency={user.currency} />
        <RiskProgress trades={trades} balance={user.currentBalance || 0} currency={user.currency} />
        <div className="card h-full flex items-center justify-center">
          <BalanceChip balance={user.currentBalance || 0} currency={user.currency} />
        </div>
      </div>

      {/* Selector de Timeframe */}
      <TimeframeSelector onChange={setTf} initialMode="month" />

      {/* 10 KPIs com modal por KPI */}
      <KpiGrid
        kpis={kpis.map((k) => ({
          ...k,
          value:
            typeof k.value === "number" && ["pnl", "expectancy", "avgPerSession", "maxDD"].includes(k.key)
              ? parseFloat((k.value as number).toFixed(2))
              : k.value,
          suffix: k.key === "retPct" || k.key === "winRate" ? "%" : k.suffix,
        }))}
        charts={charts}
        currency={user.currency}
      />

      {/* Charts topo — AGORA seguem o timeframe */}
      <div className="grid md:grid-cols-2 gap-3">
        <PnlMonthLine data={tfSeries} />
        <WinLossDonut wins={tfWins} losses={tfLosses} />
      </div>

      {/* Order + Cashflows */}
      <OrderForm balance={user.currentBalance || 0} currency={user.currency} />
      <CashflowsCard cashflows={cashflows} currency={user.currency} />

      {/* Trades */}
      <TradesTable trades={trades} />

      {/* Extra charts */}
      <div className="grid md:grid-cols-2 gap-3">
        <SessionCandles data={daily.map((d) => ({ key: d.key.slice(-2), pnl: d.pnl }))} />
        <DailyBars data={daily.map((d) => ({ key: d.key.slice(-2), pnl: d.pnl }))} />
      </div>

      {/* Gráficos novos */}
      <div className="grid md:grid-cols-2 gap-3">
        <TradeCandles data={tradeCandles} currency={user.currency} />
        <DailyPctLine data={dailyPctLine} />
      </div>

      {/* Calendar */}
      {!annualMode ? (
        <CalendarMonth
          y={viewYear}
          m={viewMonth}
          daily={daily}
          tradesByDay={byDay}
          currency={user.currency}
          onPrev={() => {
            let y = viewYear, m = viewMonth - 1;
            if (m < 0) { m = 11; y--; }
            setViewYear(y); setViewMonth(m);
          }}
          onNext={() => {
            let y = viewYear, m = viewMonth + 1;
            if (m > 11) { m = 0; y++; }
            setViewYear(y); setViewMonth(m);
          }}
          onPickMonth={(y, m) => { setViewYear(y); setViewMonth(m); }}
          onAnnual={() => { setAnnualYear(viewYear); setAnnualMode(true); }}
        />
      ) : null}

      {/* Month summary */}
      {!annualMode ? (
        <MonthSummary
          monthLabel={monthLabel(viewYear, viewMonth)}
          currency={user.currency}
          monthPnL={monthPnL}
          monthPct={monthPct}
          monthWinRate={monthWinRate}
          totalTrades={daily.reduce((a, d) => a + d.trades, 0)}
          best={best ? `${best.key} (${best.pnl.toFixed(2)})` : "—"}
          worst={worst ? `${worst.key} (${worst.pnl.toFixed(2)})` : "—"}
          avgPerTrade={totalTradesInMonth ? monthPnL / totalTradesInMonth : 0}
          daysLeft={isCurrent ? Math.max(0, Math.ceil((e.getTime() - new Date().getTime()) / 86400000)) : 0}
        />
      ) : null}

      {/* Payout */}
      {!annualMode ? (
        <PayoutCard
          y={viewYear}
          m={viewMonth}
          currency={user.currency}
          monthPnL={monthPnL}
          daysLeft={isCurrent ? Math.max(0, Math.ceil((e.getTime() - new Date().getTime()) / 86400000)) : 0}
          monthsStats={{
            expenses,
            sessionsSoFar: daily.filter((d) => d.hasTrades).length,
            daysElapsed: daily.length,
            sessionRate: daily.filter((d) => d.hasTrades).length / daily.length,
          }}
        />
      ) : null}

      {/* Exports */}
      <ExportsCard
        year={viewYear}
        month={viewMonth}
        currency={user.currency}
        user={{ startingBalance: user.startingBalance || 0, currentBalance: user.currentBalance || 0 }}
        monthLabel={monthLabel(viewYear, viewMonth)}
        monthPnL={monthPnL}
        expenses={expenses}
        winRate={monthWinRate}
        daysLeft={isCurrent ? Math.max(0, Math.ceil((e.getTime() - new Date().getTime()) / 86400000)) : 0}
        daily={daily.map((d) => ({
          key: d.key, trades: d.trades, pnl: d.pnl, pctCumul: d.pctCumul, dd: d.dd, hasTrades: d.hasTrades,
        }))}
        trades={trades}
        cashflows={cashflows}
      />

      {/* Annual mode */}
      {annualMode && (
        <div className="card">
          <AnnualSwitch
            y={annualYear}
            months={Array.from({ length: 12 }, (_, m) => {
              const ms = startOfMonth(annualYear, m).getTime();
              const me = endOfMonth(annualYear, m).getTime();
              const list = trades.filter(
                (t) => t.status === "closed" && t.closedAt! >= ms && t.closedAt! <= me
              );
              const pnl = list.reduce((a, t) => a + (t.pnl || 0), 0);
              const wr = list.length
                ? (list.filter((t) => (t.pnl || 0) >= 0).length / list.length) * 100
                : 0;
              return { m, pnl, trades: list.length, winRate: wr };
            })}
            currency={user.currency}
            onBack={() => setAnnualMode(false)}
            onPrevYear={() => setAnnualYear((y) => y - 1)}
            onNextYear={() => setAnnualYear((y) => y + 1)}
            onPickYear={(y: number) => setAnnualYear(y)}
          />
        </div>
      )}
    </div>
  );
}

function AnnualSwitch(props: any) {
  const { y, months, currency, onBack, onPrevYear, onNextYear, onPickYear } = props;
  const AnnualCard = require("@/components/AnnualCard").default;
  return (
    <AnnualCard
      y={y}
      months={months}
      currency={currency}
      onBack={onBack}
      onPrevYear={onPrevYear}
      onNextYear={onNextYear}
      onPickYear={onPickYear}
    />
  );
}

function Onboarding({
  currencyDefault,
  onSave,
}: {
  currencyDefault: string;
  onSave: (v: number, cur: string) => Promise<void>;
}) {
  const [value, setValue] = useState<string>("");
  const [currency, setCurrency] = useState<string>(currencyDefault || "EUR");
  const [err, setErr] = useState<string>("");

  const submit = async () => {
    setErr("");
    const v = parseFloat(value);
    if (!isFinite(v) || v <= 0) {
      setErr("Valor inválido");
      return;
    }
    await onSave(v, currency);
  };

  return (
    <div className="max-w-md mx-auto card">
      <h3 className="font-bold mb-2">Configura a tua conta</h3>
      <p className="small">Primeiro login: define o <b>valor inicial</b> e a moeda.</p>
      <label className="label">Valor inicial</label>
      <input className="input mb-2" value={value} onChange={(e) => setValue(e.target.value)} placeholder="1000" type="number" step="0.01" />
      <label className="label">Moeda</label>
      <select className="select mb-3" value={currency} onChange={(e) => setCurrency(e.target.value)}>
        <option value="EUR">EUR</option>
        <option value="USD">USD</option>
        <option value="BRL">BRL</option>
      </select>
      {err && <div className="text-danger text-sm mb-2">{err}</div>}
      <div className="flex justify-end">
        <button className="btn" onClick={submit}>Guardar e continuar</button>
      </div>
    </div>
  );
}
