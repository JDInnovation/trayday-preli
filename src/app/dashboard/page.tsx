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
import { Activity, BarChart2, Calendar, Download, Gauge, LineChart, PieChart } from "lucide-react";

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

  if (!uid) return <div className="card container-padded">A iniciar sessão…</div>;
  if (!user) return <div className="card container-padded">A carregar…</div>;
  if (needsOnboarding) {
    return (
      <div className="container-padded">
        <Onboarding
          currencyDefault={user.currency}
          onSave={async (val, cur) => {
            await saveOnboarding(uid!, val, cur);
            setNeedsOnboarding(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="container-padded">
      <DashboardContent user={user} trades={trades} cashflows={cashflows} />
    </div>
  );
}

/* ===========================
   CONTENT
   =========================== */

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

  // --- Fechadas do mês
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

  const wins = tradesClosedMonth.filter((t) => (t.pnl || 0) >= 0).length;

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

  // ---------- TIMEFRAME + KPIs ----------
  const [tf, setTf] = useState<Timeframe>(() => {
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);
    return { mode: "month", start, end, label: "" };
  });

  const { list: kpis, charts } = useMemo(
    () => computeKPIs(trades, cashflows, tf.start, tf.end, user.startingBalance || 0, user.currentBalance || 0),
    [trades, cashflows, tf, user.startingBalance, user.currentBalance]
  );

  // ---------- Gráficos que seguem o timeframe ----------
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

  // ---------- UI ----------
  const monthLbl = monthLabel(viewYear, viewMonth);

  return (
    <div className="flex flex-col gap-6">
      <HeaderBar />

      {/* Nav secundária + Timeframe sticky */}
      <div className="sticky top-2 z-30">
        <div className="card flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <AnchorNav
            items={[
              { href: "#overview", label: "Visão rápida", icon: <Activity className="h-4 w-4" /> },
              { href: "#kpis", label: "KPIs", icon: <Gauge className="h-4 w-4" /> },
              { href: "#charts", label: "Gráficos", icon: <LineChart className="h-4 w-4" /> },
              { href: "#records", label: "Registos", icon: <BarChart2 className="h-4 w-4" /> },
              { href: "#calendar", label: "Calendário", icon: <Calendar className="h-4 w-4" /> },
              { href: "#exports", label: "Exportar", icon: <Download className="h-4 w-4" /> },
            ]}
          />
          <div className="min-w-[260px]">
            <TimeframeSelector onChange={setTf} initialMode="month" />
          </div>
        </div>
      </div>

      {/* Overview */}
      <section id="overview" className="flex flex-col gap-3">
        <SectionHeading
          title="Visão rápida"
          subtitle="Sessão atual, risco e saldo"
          icon={<Activity className="h-5 w-5" />}
          right={<span className="badge">{monthLbl}</span>}
        />
        <div className="grid md:grid-cols-3 gap-3 items-stretch">
          <TodayPulse trades={trades} currency={user.currency} />
          <RiskProgress trades={trades} balance={user.currentBalance || 0} currency={user.currency} />
          <div className="card h-full flex items-center justify-center">
            <BalanceChip balance={user.currentBalance || 0} currency={user.currency} />
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section id="kpis" className="flex flex-col gap-3">
        <SectionHeading
          title="KPIs"
          subtitle="10 indicadores com gráficos dedicados"
          icon={<Gauge className="h-5 w-5" />}
        />
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
      </section>

      {/* Charts topo — seguem timeframe */}
      <section id="charts" className="flex flex-col gap-3">
        <SectionHeading
          title="Gráficos principais"
          subtitle="Evolução e distribuição"
          icon={<LineChart className="h-5 w-5" />}
        />
        <div className="grid md:grid-cols-2 gap-3">
          <PnlMonthLine data={tfSeries} />
          <WinLossDonut wins={tfWins} losses={tfLosses} />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <SessionCandles data={daily.map((d) => ({ key: d.key.slice(-2), pnl: d.pnl }))} />
          <DailyBars data={daily.map((d) => ({ key: d.key.slice(-2), pnl: d.pnl }))} />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <TradeCandles
            data={useMemo(() => {
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
            }, [tradesClosedMonth])}
            currency={user.currency}
          />
          <DailyPctLine data={daily.map((d, i) => ({ key: String(i + 1).padStart(2, "0"), v: d.pctCumul }))} />
        </div>
      </section>

      {/* Registos */}
      <section id="records" className="flex flex-col gap-3">
        <SectionHeading
          title="Registos"
          subtitle="Abertura de trade e movimentos da conta"
          icon={<PieChart className="h-5 w-5" />}
        />
        <div className="grid md:grid-cols-2 gap-3">
          <OrderForm balance={user.currentBalance || 0} currency={user.currency} />
          <CashflowsCard cashflows={cashflows} currency={user.currency} />
        </div>

        <div className="mt-1">
          <SectionSubheading title="Trades" />
          <TradesTable trades={trades} />
        </div>
      </section>

      {/* Calendário e Resumo */}
      <section id="calendar" className="flex flex-col gap-3">
        <SectionHeading
          title="Calendário & resumo do mês"
          subtitle="Sessões, desempenho diário e síntese"
          icon={<Calendar className="h-5 w-5" />}
        />
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

        {!annualMode ? (
          <MonthSummary
            monthLabel={monthLbl}
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
      </section>

      {/* Exportações */}
      <section id="exports" className="flex flex-col gap-3">
        <SectionHeading
          title="Exportações"
          subtitle="CSV, texto, PDF e cópia rápida"
          icon={<Download className="h-5 w-5" />}
        />
        <ExportsCard
          year={viewYear}
          month={viewMonth}
          currency={user.currency}
          user={{ startingBalance: user.startingBalance || 0, currentBalance: user.currentBalance || 0 }}
          monthLabel={monthLbl}
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
      </section>
    </div>
  );
}

/* ===========================
   AUX COMPONENTS (UI)
   =========================== */

function AnchorNav({
  items,
}: {
  items: { href: string; label: string; icon?: React.ReactNode }[];
}) {
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((it) => (
        <a key={it.href} href={it.href} className="chip hover:opacity-100">
          {it.icon}
          <span>{it.label}</span>
        </a>
      ))}
    </nav>
  );
}

function SectionHeading({
  title,
  subtitle,
  icon,
  right,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon ? <div className="icon-btn">{icon}</div> : null}
        <div>
          <h3 className="text-lg md:text-xl font-semibold leading-tight">{title}</h3>
          {subtitle ? <div className="small">{subtitle}</div> : null}
        </div>
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}

function SectionSubheading({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1.5 h-5 rounded-full" style={{ background: "var(--brand)" }} />
      <div className="small uppercase tracking-wide">{title}</div>
    </div>
  );
}

/* ===========================
   ANNUAL SWITCH WRAPPER
   =========================== */

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

/* ===========================
   ONBOARDING
   =========================== */

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
