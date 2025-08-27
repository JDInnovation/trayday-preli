import { Trade, Cashflow } from "@/lib/types";

// Helpers
const DAY_MS = 86400000;
function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function inRange(ts: number, start: Date, end: Date) {
  return ts >= start.getTime() && ts <= end.getTime();
}

export type KpiKey =
  | "pnl"
  | "retPct"
  | "tradesCount"
  | "winRate"
  | "expectancy"
  | "profitFactor"
  | "maxDD"
  | "avgPerSession"
  | "streak"
  | "riskViolations";

export type KpiValue = {
  key: KpiKey;
  label: string;
  value: number | string;
  tone?: "pos" | "neg";
  suffix?: string;
  description: string;
};

export type ChartData = { x: string | number; y: number }[];

export type KpiCharts = Partial<Record<KpiKey, ChartData>>;

export type DailyRow = {
  key: string;
  date: Date;
  trades: Trade[];
  dayPnL: number;
  wins: number;
  losses: number;
  equity: number; // close
  peak: number;
  dd: number; // negative or 0
  violations: {
    tradeLossOver3: number;
    dayLossOver9: number; // 0|1
    oversize?: number; // se conseguirmos
  };
};

export function computeKPIs(
  trades: Trade[],
  cashflows: Cashflow[],
  start: Date,
  end: Date,
  startingBalance: number,
  currentBalance: number
): { list: KpiValue[]; charts: KpiCharts } {
  // Baseline de equity no início do período
  const pnlBefore = trades
    .filter((t) => t.status === "closed" && t.closedAt && t.closedAt < start.getTime())
    .reduce((a, t) => a + (t.pnl || 0), 0);
  const cashBefore = cashflows
    .filter((c) => c.at < start.getTime())
    .reduce((a, c) => a + (c.type === "deposit" ? c.amount : -c.amount), 0);
  const equityStart = startingBalance + pnlBefore + cashBefore;

  // Filtrar período
  const tradesP = trades
    .filter((t) => t.status === "closed" && t.closedAt && inRange(t.closedAt, start, end))
    .sort((a, b) => a.closedAt! - b.closedAt!);

  const cashP = cashflows.filter((c) => inRange(c.at, start, end));

  // Série diária
  const days: DailyRow[] = [];
  let equity = equityStart;
  let peak = equity;

  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
    const date = new Date(t);
    const key = ymd(date);
    const tsStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime();
    const tsEnd = tsStart + DAY_MS - 1;

    const tradesDay = trades.filter(
      (tr) =>
        tr.status === "closed" &&
        tr.closedAt &&
        tr.closedAt >= tsStart &&
        tr.closedAt <= tsEnd
    );
    const dayPnL = tradesDay.reduce((a, tr) => a + (tr.pnl || 0), 0);
    equity += dayPnL;

    if (equity > peak) peak = equity;
    const dd = equity - peak; // <= 0

    // violações (aproximações seguras)
    const tradeLossOver3 = tradesDay.filter((tr) => (tr.pnl || 0) < -0.03 * (currentBalance || 0)).length;
    const dayLossOver9 = dayPnL < -0.09 * (currentBalance || 0) ? 1 : 0;

    days.push({
      key,
      date,
      trades: tradesDay,
      dayPnL,
      wins: tradesDay.filter((tr) => (tr.pnl || 0) >= 0).length,
      losses: tradesDay.filter((tr) => (tr.pnl || 0) < 0).length,
      equity,
      peak,
      dd,
      violations: { tradeLossOver3, dayLossOver9 },
    });
  }

  // Agregados do período
  const pnl = tradesP.reduce((a, t) => a + (t.pnl || 0), 0);
  const equityEnd = equityStart + pnl + cashP.reduce((a, c) => a + (c.type === "deposit" ? c.amount : -c.amount), 0);
  const retPct = equityStart > 0 ? ((equityEnd - equityStart) / equityStart) * 100 : 0;

  const tradesCount = tradesP.length;
  const wins = tradesP.filter((t) => (t.pnl || 0) >= 0).length;
  const winRate = tradesCount ? (wins / tradesCount) * 100 : 0;

  const expectancy = tradesCount ? pnl / tradesCount : 0;

  const grossProfit = tradesP.filter((t) => (t.pnl || 0) > 0).reduce((a, t) => a + (t.pnl || 0), 0);
  const grossLossAbs = Math.abs(tradesP.filter((t) => (t.pnl || 0) < 0).reduce((a, t) => a + (t.pnl || 0), 0));
  const profitFactor = grossLossAbs ? grossProfit / grossLossAbs : grossProfit > 0 ? Infinity : 0;

  const maxDD = Math.min(...days.map((d) => d.dd), 0);

  const sessions = days.filter((d) => d.trades.length > 0);
  const avgPerSession = sessions.length ? sessions.reduce((a, d) => a + d.dayPnL, 0) / sessions.length : 0;

  // Streak atual (W/L consecutivos no fim do período)
  let streak = 0;
  let mode: "W" | "L" | null = null;
  for (let i = tradesP.length - 1; i >= 0; i--) {
    const w = (tradesP[i].pnl || 0) >= 0;
    if (mode == null) {
      mode = w ? "W" : "L";
      streak = 1;
    } else if ((mode === "W" && w) || (mode === "L" && !w)) {
      streak++;
    } else break;
  }
  const streakLabel = mode ? `${mode}${streak}` : "—";

  const riskViolations =
    days.reduce((a, d) => a + d.violations.tradeLossOver3 + d.violations.dayLossOver9 + (d.violations.oversize || 0), 0) || 0;

  // Datasets para gráficos por KPI
  // 1) PnL acumulado por trade
  let acc = 0;
  const pnlLine: ChartData = [{ x: 0, y: 0 }];
  tradesP.forEach((t, i) => {
    acc += t.pnl || 0;
    pnlLine.push({ x: i + 1, y: acc });
  });
  if (pnlLine.length === 1) pnlLine.push({ x: 1, y: 0 });

  // 2) % retorno acumulado por dia
  const retLine: ChartData = [];
  let eq = equityStart;
  for (const d of days) {
    eq += d.dayPnL;
    const pct = equityStart > 0 ? ((eq - equityStart) / equityStart) * 100 : 0;
    retLine.push({ x: d.key.slice(5), y: pct });
  }

  // 3) Nº trades por dia
  const tradesBars: ChartData = days.map((d) => ({ x: d.key.slice(5), y: d.trades.length }));

  // 4) Win rate acumulado (running)
  const winLine: ChartData = [];
  let wCount = 0;
  tradesP.forEach((t, i) => {
    if ((t.pnl || 0) >= 0) wCount++;
    winLine.push({ x: i + 1, y: ((wCount / (i + 1)) * 100) || 0 });
  });

  // 5) Distribuição de PnL (bins)
  const bins: ChartData = [];
  const values = tradesP.map((t) => t.pnl || 0);
  if (values.length) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const k = Math.max(5, Math.min(14, Math.ceil(Math.sqrt(values.length))));
    const step = (max - min) / k || 1;
    for (let i = 0; i < k; i++) bins.push({ x: i, y: 0 });
    values.forEach((v) => {
      let idx = Math.floor((v - min) / step);
      if (idx >= k) idx = k - 1;
      if (idx < 0) idx = 0;
      bins[idx].y++;
    });
  }

  // 6) PF: barras GP vs GL
  const pfBars: ChartData = [
    { x: "Gross +", y: grossProfit },
    { x: "Gross -", y: -grossLossAbs },
  ];

  // 7) Max DD: série dd por dia
  const ddLine: ChartData = days.map((d) => ({ x: d.key.slice(5), y: d.dd }));

  // 8) Média por sessão: barras por dia + referência da média
  const dayBars: ChartData = days.map((d) => ({ x: d.key.slice(5), y: d.dayPnL }));

  // 9) Streak: últimos 20 trades como +1/-1
  const lastN = tradesP.slice(-20);
  const streakLine: ChartData = lastN.map((t, i) => ({ x: i + 1, y: (t.pnl || 0) >= 0 ? 1 : -1 }));

  // 10) Violações por dia
  const violBars: ChartData = days.map((d) => ({
    x: d.key.slice(5),
    y: d.violations.tradeLossOver3 + d.violations.dayLossOver9 + (d.violations.oversize || 0),
  }));

  const list: KpiValue[] = [
    { key: "pnl", label: "PnL do período", value: pnl, tone: pnl >= 0 ? "pos" : "neg", suffix: "", description: "Soma do PnL das trades fechadas no período." },
    { key: "retPct", label: "% Retorno", value: isFinite(retPct) ? retPct : 0, tone: retPct >= 0 ? "pos" : "neg", suffix: "%", description: "Variação percentual da equity no período, face ao início." },
    { key: "tradesCount", label: "Nº de trades", value: tradesCount, description: "Total de trades fechadas dentro do período." },
    { key: "winRate", label: "Win rate", value: isFinite(winRate) ? winRate : 0, suffix: "%", description: "Percentagem de trades com PnL ≥ 0." },
    { key: "expectancy", label: "Expectancy/trade", value: expectancy, description: "Média do PnL por trade no período." },
    { key: "profitFactor", label: "Profit Factor", value: isFinite(profitFactor) ? profitFactor : 0, description: "Gross profit / |Gross loss| no período." },
    { key: "maxDD", label: "Máx. drawdown", value: maxDD, tone: maxDD < 0 ? "neg" : undefined, description: "Pior diferença entre a equity e o pico atingido no período." },
    { key: "avgPerSession", label: "Média por sessão", value: avgPerSession, description: "Média de PnL apenas dos dias com trades." },
    { key: "streak", label: "Streak atual", value: streakLabel, description: "Sequência atual de vitórias (W) ou derrotas (L) nas últimas trades." },
    { key: "riskViolations", label: "Violações de risco", value: riskViolations, description: "Ocorrências no período: perda >3% por trade ou perda diária >9%." },
  ];

  const charts: KpiCharts = {
    pnl: pnlLine,
    retPct: retLine,
    tradesCount: tradesBars,
    winRate: winLine,
    expectancy: bins,
    profitFactor: pfBars,
    maxDD: ddLine,
    avgPerSession: dayBars,
    streak: streakLine,
    riskViolations: violBars,
  };

  return { list, charts };
}
