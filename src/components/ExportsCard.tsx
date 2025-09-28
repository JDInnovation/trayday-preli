"use client";

import { Trade, Cashflow } from "@/lib/types";
import { fmtMoney, monthKey, pad2 } from "@/lib/utils";
import { useMemo, useState, useEffect } from "react";

function buildMonthlyText(
  brandName: string,
  accountEmail: string | undefined,
  reportCode: string,
  currency: string,
  monthLabel: string,
  startingBalance: number,
  currentBalance: number,
  monthPnL: number,
  expenses: number,
  winRate: number,
  daysLeft: number,
  daily: { key: string; trades: number; pnl: number; pctCumul: number; dd: number; hasTrades: boolean }[],
  cashflowsMonthTotal: number
) {
  const growthPct = startingBalance > 0 ? ((currentBalance - startingBalance) / startingBalance) * 100 : 0;
  const payoutNow = Math.max(0, (monthPnL - expenses) * 0.35);
  const lines: string[] = [];
  // Cabeçalho TrayDay
  lines.push(`${brandName}`);
  lines.push(`Conta: ${accountEmail ?? '—'}`);
  lines.push(`Código: ${reportCode}`);
  lines.push("");
  lines.push(`Relatório — ${monthLabel}`);
  lines.push(`Conta inicial: ${fmtMoney(startingBalance, currency)} | Saldo atual: ${fmtMoney(currentBalance, currency)}`);
  lines.push(`% lucro desde o início: ${isFinite(growthPct) ? growthPct.toFixed(2) : "—"}%`);
  lines.push(`PnL mês: ${fmtMoney(monthPnL, currency)} | Despesas: ${fmtMoney(expenses, currency)} | Payout (35%): ${fmtMoney(payoutNow, currency)}`);
  lines.push(`Depósitos/levantamentos (mês): ${fmtMoney(cashflowsMonthTotal, currency)} | Win rate mês: ${winRate.toFixed(2)}% | Dias por fechar: ${daysLeft || "—"}`);
  lines.push("");
  lines.push("Dia; Trades; PnL; Δ% cumul; DD cumul");
  daily.forEach(d => {
    const pnlTxt = d.hasTrades ? fmtMoney(d.pnl, currency) : "—";
    const pctTxt = d.hasTrades ? `${d.pctCumul.toFixed(2)}%` : "—";
    const ddTxt = d.hasTrades ? fmtMoney(d.dd, currency) : "—";
    lines.push(`${d.key}; ${d.trades}; ${pnlTxt}; ${pctTxt}; ${ddTxt}`);
  });
  return lines.join("\n");
}

// ——————————————————————————————————————————————————————————
// NOVO: Export em PDF com layout organizado (A4, tabelas, KPIs)
// ——————————————————————————————————————————————————————————

function safe(s: unknown) {
  const str = String(s ?? "");
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function pct(n?: number) {
  if (n == null || !isFinite(n)) return "—";
  return `${n.toFixed(2)}%`;
}

// Helpers para intervalo
function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function inRange(ts: number | undefined | null, a: Date, b: Date) {
  if (!ts && ts !== 0) return false;
  const t = typeof ts === 'number' ? ts : Number(ts);
  return t >= a.getTime() && t <= b.getTime();
}

function buildDailyFromTrades(trades: Trade[], startingBalance: number) {
  // Agrupa por dia, contando trade no dia de close se existir, senão no dia de open
  const map: Record<string, { key: string; trades: number; pnl: number; pctCumul: number; dd: number; hasTrades: boolean; date: Date }>= {};
  trades.forEach(t => {
    const when = t.closedAt ? new Date(t.closedAt) : (t.openAt ? new Date(t.openAt) : null);
    if (!when) return;
    const key = toYMD(when);
    if (!map[key]) map[key] = { key, trades: 0, pnl: 0, pctCumul: 0, dd: 0, hasTrades: true, date: startOfDay(when) };
    map[key].trades += 1;
    // PnL só conta quando fechado; se ainda aberto, assume 0 para o dia
    if (t.closedAt != null) map[key].pnl += (t.pnl ?? 0);
  });
  const days = Object.values(map).sort((a,b) => a.date.getTime() - b.date.getTime());
  // Cálculo de cumulativos e DD
  let cumul = 0;
  let peak = startingBalance;
  days.forEach(d => {
    cumul += d.pnl;
    const equity = startingBalance + cumul;
    if (equity > peak) peak = equity;
    const dd = equity - peak; // negativo em drawdown
    d.pctCumul = startingBalance > 0 ? ((equity - startingBalance) / startingBalance) * 100 : 0;
    d.dd = dd; // valor negativo (ou 0)
  });
  return days;
}

// Código único do relatório (prefixo 'ct' + 9 chars). Evita repetições via localStorage.
function generateUniqueCode(prefix = 'ct', len = 9) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // evita 0/O/I/1
  const storeKey = 'trayday_report_codes';
  let used: Record<string, true> = {};
  try { used = JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch {}
  let code = '';
  do {
    let rnd = '';
    for (let i = 0; i < len; i++) rnd += alphabet[Math.floor(Math.random() * alphabet.length)];
    code = `${prefix}-${rnd}`;
  } while (used[code]);
  used[code] = true;
  try { localStorage.setItem(storeKey, JSON.stringify(used)); } catch {}
  return code;
}

async function fetchImageDataURL(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const p: Promise<string> = new Promise((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject('noctx'); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject('imgerror');
    });
    img.src = url;
    return await p;
  } catch {
    return null;
  }
}

function buildMonthlyHtml(opts: {
  currency: string;
  monthLabel: string;
  startingBalance: number;
  currentBalance: number;
  monthPnL: number;
  expenses: number;
  winRate: number;
  daysLeft: number;
  daily: { key: string; trades: number; pnl: number; pctCumul: number; dd: number; hasTrades: boolean }[];
  trades: Trade[];
  cashflows: Cashflow[];
  year: number;
  month: number; // 0-11
}) {
  const {
    currency, monthLabel, startingBalance, currentBalance,
    monthPnL, expenses, winRate, daysLeft,
    daily, trades, cashflows, year, month
  } = opts;

  const growthPct = startingBalance > 0 ? ((currentBalance - startingBalance) / startingBalance) * 100 : 0;
  const payoutNow = Math.max(0, (monthPnL - expenses) * 0.35);

  // Estatísticas dos trades
  const closed = trades.filter(t => !!t.closedAt);
  const totalTrades = trades.length;
  const closedCount = closed.length;
  const longCount = trades.filter(t => (t.side || "").toLowerCase() === "long").length;
  const shortCount = trades.filter(t => (t.side || "").toLowerCase() === "short").length;
  const totalFees = trades.reduce((a, t) => a + (t.fees ?? 0), 0);
  const avgR = (() => {
    const rs = closed.map(t => t.r).filter((r): r is number => typeof r === "number" && isFinite(r));
    if (!rs.length) return undefined;
    return rs.reduce((a, b) => a + b, 0) / rs.length;
  })();
  const bestTrade = closed.reduce<Trade | null>((best, t) => (best == null || (t.pnl ?? -Infinity) > (best.pnl ?? -Infinity)) ? t : best, null);
  const worstTrade = closed.reduce<Trade | null>((worst, t) => (worst == null || (t.pnl ?? Infinity) < (worst.pnl ?? Infinity)) ? t : worst, null);

  // Estatísticas diárias
  const effectiveDays = daily.filter(d => d.hasTrades);
  const bestDay = effectiveDays.reduce<typeof effectiveDays[number] | null>((best, d) => (best == null || d.pnl > best.pnl) ? d : best, null);
  const worstDay = effectiveDays.reduce<typeof effectiveDays[number] | null>((worst, d) => (worst == null || d.pnl < worst.pnl) ? d : worst, null);
  const maxDD = effectiveDays.length ? Math.min(...effectiveDays.map(d => d.dd)) : 0; // valor mais negativo

  // Cashflows do mês
  const cfMonth = cashflows
    .filter(c => {
      const d = new Date((c as any).ts ?? (c as any).date ?? 0);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .sort((a, b) => ((a as any).ts ?? 0) - ((b as any).ts ?? 0));
  const cfMonthTotal = cfMonth.reduce((a, c) => a + ((c as any).amount ?? 0), 0);

  const genAt = new Date();

  const html = `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8" />
<title>Relatório — ${safe(monthLabel)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Inter, Ubuntu, "Helvetica Neue", Arial, sans-serif; color: #0b1020; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 18px 0 8px; color: #111827; }
  p, li, td, th { font-size: 12px; }
  .muted { color: #6b7280; }
  .kpis { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .kpi { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; background: #fafafa; }
  .kpi .label { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; }
  .kpi .value { font-size: 14px; font-weight: 700; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid #e5e7eb; padding: 6px 8px; vertical-align: top; }
  th { background: #f3f4f6; text-align: left; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  tr:nth-child(even) td { background: #fafafa; }
  .pos { color: #14532d; }
  .neg { color: #7f1d1d; }
  .section { page-break-inside: avoid; }
  .mb8 { margin-bottom: 8px; }
  .mb12 { margin-bottom: 12px; }
  .small { font-size: 11px; }
  .footer { margin-top: 18px; border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 10px; color: #6b7280; }
</style>
</head>
<body>
  <header class="section mb8">
    <h1>Relatório mensal — ${safe(monthLabel)}</h1>
    <p class="muted small">Gerado em ${safe(genAt.toLocaleString("pt-PT"))}</p>
  </header>

  <section class="section">
    <h2>Resumo</h2>
    <div class="kpis">
      <div class="kpi"><div class="label">Saldo inicial</div><div class="value">${safe(fmtMoney(startingBalance, currency))}</div></div>
      <div class="kpi"><div class="label">Saldo atual</div><div class="value">${safe(fmtMoney(currentBalance, currency))}</div></div>
      <div class="kpi"><div class="label">Crescimento desde o início</div><div class="value">${safe(isFinite(growthPct) ? growthPct.toFixed(2) : "—")}%</div></div>
      <div class="kpi"><div class="label">PnL do mês</div><div class="value ${monthPnL >= 0 ? "pos" : "neg"}">${safe(fmtMoney(monthPnL, currency))}</div></div>
      <div class="kpi"><div class="label">Despesas do mês</div><div class="value">${safe(fmtMoney(expenses, currency))}</div></div>
      <div class="kpi"><div class="label">Payout estimado (35%)</div><div class="value">${safe(fmtMoney(payoutNow, currency))}</div></div>
      <div class="kpi"><div class="label">Cashflow do mês</div><div class="value ${cfMonthTotal >= 0 ? "pos" : "neg"}">${safe(fmtMoney(cfMonthTotal, currency))}</div></div>
      <div class="kpi"><div class="label">Win rate do mês</div><div class="value">${safe(winRate.toFixed(2))}%</div></div>
      <div class="kpi"><div class="label">Dias por fechar</div><div class="value">${safe(daysLeft || "—")}</div></div>
      <div class="kpi"><div class="label">Trades (totais / fechados)</div><div class="value">${safe(totalTrades)} / ${safe(closedCount)}</div></div>
      <div class="kpi"><div class="label">Long / Short</div><div class="value">${safe(longCount)} / ${safe(shortCount)}</div></div>
      <div class="kpi"><div class="label">Comissões</div><div class="value">${safe(fmtMoney(totalFees, currency))}</div></div>
      <div class="kpi"><div class="label">R médio (fechados)</div><div class="value">${avgR == null ? "—" : safe(avgR.toFixed(2))}</div></div>
      <div class="kpi"><div class="label">Melhor dia</div><div class="value ${bestDay && bestDay.pnl >= 0 ? "pos" : "neg"}">${bestDay ? safe(`${bestDay.key} • ${fmtMoney(bestDay.pnl, currency)}`) : "—"}</div></div>
      <div class="kpi"><div class="label">Pior dia</div><div class="value ${worstDay && worstDay.pnl >= 0 ? "pos" : "neg"}">${worstDay ? safe(`${worstDay.key} • ${fmtMoney(worstDay.pnl, currency)}`) : "—"}</div></div>
      <div class="kpi"><div class="label">Max drawdown (mês)</div><div class="value ${maxDD >= 0 ? "pos" : "neg"}">${safe(fmtMoney(maxDD, currency))}</div></div>
    </div>
  </section>

  <section class="section">
    <h2>Quebra diária</h2>
    <table>
      <thead>
        <tr>
          <th>Dia</th>
          <th class="num">Trades</th>
          <th class="num">PnL</th>
          <th class="num">Δ% cumul</th>
          <th class="num">DD cumul</th>
        </tr>
      </thead>
      <tbody>
        ${daily.map(d => `
          <tr>
            <td>${safe(d.key)}</td>
            <td class="num">${safe(d.trades)}</td>
            <td class="num ${d.pnl >= 0 ? "pos" : "neg"}">${d.hasTrades ? safe(fmtMoney(d.pnl, currency)) : "—"}</td>
            <td class="num">${d.hasTrades ? safe(pct(d.pctCumul)) : "—"}</td>
            <td class="num ${d.dd >= 0 ? "pos" : "neg"}">${d.hasTrades ? safe(fmtMoney(d.dd, currency)) : "—"}</td>
          </tr>`).join("")}
      </tbody>
    </table>
  </section>

  <section class="section">
    <h2>Trades — destaques</h2>
    <table>
      <tbody>
        <tr>
          <th>Melhor trade</th>
          <td>${bestTrade ? safe(`${bestTrade.symbol ?? "—"} • ${bestTrade.closedAt ? new Date(bestTrade.closedAt).toLocaleString("pt-PT") : "—"}`) : "—"}</td>
          <td class="num pos">${bestTrade ? safe(fmtMoney(bestTrade.pnl ?? 0, currency)) : ""}</td>
        </tr>
        <tr>
          <th>Pior trade</th>
          <td>${worstTrade ? safe(`${worstTrade.symbol ?? "—"} • ${worstTrade.closedAt ? new Date(worstTrade.closedAt).toLocaleString("pt-PT") : "—"}`) : "—"}</td>
          <td class="num neg">${worstTrade ? safe(fmtMoney(worstTrade.pnl ?? 0, currency)) : ""}</td>
        </tr>
      </tbody>
    </table>
    <p class="small muted mb12">* Valores em ${safe(currency)}. R médio calculado sobre trades fechados com R definido.</p>
  </section>

  <section class="section">
    <h2>Cashflows do mês</h2>
    ${cfMonth.length === 0 ? '<p class="muted">Sem movimentos no mês.</p>' : `
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Nota</th>
            <th class="num">Montante</th>
          </tr>
        </thead>
        <tbody>
          ${cfMonth.map((c: any) => `
            <tr>
              <td>${c.ts ? new Date(c.ts).toLocaleString("pt-PT") : "—"}</td>
              <td>${safe(c.type ?? c.kind ?? "—")}</td>
              <td>${safe(c.note ?? c.description ?? "")}</td>
              <td class="num ${c.amount >= 0 ? "pos" : "neg"}">${safe(fmtMoney(c.amount ?? 0, currency))}</td>
            </tr>`).join("")}
        </tbody>
        <tfoot>
          <tr>
            <th colspan="3">Total</th>
            <th class="num ${cfMonthTotal >= 0 ? "pos" : "neg"}">${safe(fmtMoney(cfMonthTotal, currency))}</th>
          </tr>
        </tfoot>
      </table>`}
  </section>

  <div class="footer">Relatório gerado automaticamente — ${safe(genAt.toLocaleDateString("pt-PT"))}</div>
</body>
</html>`;

  return html;
}

export default function ExportsCard({
  year, month, currency, user,
  monthLabel,
  monthPnL, expenses,
  winRate, daysLeft,
  daily,
  trades, cashflows,
  logoUrl,
  brandName = 'TrayDay',
}: {
  year: number; month: number; currency: string;
  user: { startingBalance: number; currentBalance: number; email?: string };
  monthLabel: string; monthPnL: number; expenses: number; winRate: number; daysLeft: number;
  daily: { key: string; trades: number; pnl: number; pctCumul: number; dd: number; hasTrades: boolean }[];
  trades: Trade[]; cashflows: Cashflow[];
  logoUrl?: string;
  brandName?: string;
}) {
  // Estado do intervalo
  const defaultMonthStr = `${year}-${pad2(month + 1)}`;
  const [mode, setMode] = useState<'month' | 'range' | 'day'>('month');
  const [monthInput, setMonthInput] = useState<string>(defaultMonthStr);
  const [startInput, setStartInput] = useState<string>("");
  const [endInput, setEndInput] = useState<string>("");
  const [dayInput, setDayInput] = useState<string>(toYMD(new Date()));

  const { startDate, endDate, periodLabel } = useMemo(() => {
    if (mode === 'day') {
      const d = dayInput || toYMD(new Date());
      const day = new Date(d);
      const s = startOfDay(day);
      const e = endOfDay(day);
      return { startDate: s, endDate: e, periodLabel: s.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }) };
    }
    if (mode === 'month') {
      const [yy, mm] = monthInput.split('-').map(Number);
      const s = new Date(yy || year, (mm ? mm - 1 : month), 1);
      const e = new Date(s.getFullYear(), s.getMonth() + 1, 0);
      return { startDate: startOfDay(s), endDate: endOfDay(e), periodLabel: s.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }) };
    }
    // RANGE
    const today = toYMD(new Date());
    const sStr = startInput || endInput || today;
    const eStr = endInput || startInput || today;
    let s = startOfDay(new Date(sStr));
    let e = endOfDay(new Date(eStr));
    if (s.getTime() > e.getTime()) { const tmp = s; s = startOfDay(e); e = endOfDay(tmp); }
    const label = `${s.toLocaleDateString('pt-PT')} — ${e.toLocaleDateString('pt-PT')}`;
    return { startDate: s, endDate: e, periodLabel: label };
  }, [mode, monthInput, startInput, endInput, dayInput, year, month]);

  const filtered = useMemo(() => {
    const tradesInRange = trades.filter(t => inRange(t.closedAt ?? t.openAt ?? null, startDate, endDate));
    const cashInRange: any[] = cashflows.filter((c: any) => inRange((c.ts ?? c.date ?? null) as any, startDate, endDate)) as any[];

    // despesas: tenta inferir por tipo 'expense' ou montantes negativos
    const expensesRange = cashInRange.reduce((a, c: any) => {
      const isExpenseType = (c.type ?? c.kind) === 'expense';
      const amt = Number(c.amount ?? 0);
      const asExpense = isExpenseType ? Math.abs(amt) : (amt < 0 ? Math.abs(amt) : 0);
      return a + asExpense;
    }, 0);

    const monthPnLRange = tradesInRange.reduce((a, t) => a + (t.closedAt ? (t.pnl ?? 0) : 0), 0);
    const closed = tradesInRange.filter(t => !!t.closedAt);
    const wr = closed.length ? (100 * closed.filter(t => (t.pnl ?? 0) > 0).length) / closed.length : 0;

    const dailyEff = buildDailyFromTrades(tradesInRange, user.startingBalance);
    const cfTotal = cashInRange.reduce((a, c: any) => a + (Number(c.amount ?? 0)), 0);

    return { trades: tradesInRange, cashflows: cashInRange, expenses: expensesRange, monthPnL: monthPnLRange, winRate: wr, daily: dailyEff, cfTotal };
  }, [trades, cashflows, startDate, endDate, user.startingBalance]);

  // código único por período
  const [reportCode, setReportCode] = useState<string>("");
  useEffect(() => { setReportCode(generateUniqueCode('ct', 9)); }, [startDate.getTime(), endDate.getTime(), mode]);

  const accountEmail = user.email;

  const txt = buildMonthlyText(
    brandName,
    accountEmail,
    reportCode,
    currency,
    periodLabel,
    user.startingBalance,
    user.currentBalance,
    filtered.monthPnL,
    filtered.expenses,
    filtered.winRate,
    0,
    filtered.daily,
    filtered.cfTotal
  );

  const saveTxt = () => {
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `relatorio-${year}-${pad2(month+1)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const saveCsv = () => {
    const rows: string[] = [];
    rows.push(["openAt","closedAt","symbol","side","riskPct","riskAmount","fees","sizeUsd","pnl","r","status","note","type","recommended","oversized"].join(","));
    filtered.trades.slice().sort((a,b) => (a.openAt||0)-(b.openAt||0)).forEach(t => {
      const row = [
        t.openAt ? new Date(t.openAt).toISOString() : "",
        t.closedAt ? new Date(t.closedAt).toISOString() : "",
        t.symbol || "", t.side || "",
        t.riskPct ?? "", t.riskAmount ?? "", t.fees ?? "",
        t.sizeUsd ?? "", t.pnl ?? "", t.r ?? "",
        t.status || "", (t.note || "").replace(/[\r\n]+/g,' ').trim(), t.tType || "",
        t.recommended ?? "", String(t.oversized ?? "")
      ].map(v => {
        const s = String(v);
        return (s.includes(",") || s.includes("\"")) ? `"${s.replace(/\"/g, "\"\"")}"` : s;
      }).join(",");
      rows.push(row);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "trades.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const copyTxt = async () => {
    await navigator.clipboard.writeText(txt);
    alert("Relatório copiado para a área de transferência.");
  };

  const downloadPdf = async () => {
    try {
      const [{ jsPDF }, autoTableMod] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable: any = (autoTableMod as any).default || (autoTableMod as any);

      const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
      const marginX = 40;
      const marginY = 40;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let cursorY = marginY;

      const genAt = new Date();

      // Header com logo + marca + email + código
      let leftX = marginX;
      const logoData = await fetchImageDataURL(logoUrl);
      if (logoData) {
        const imgW = 32, imgH = 32;
        try { doc.addImage(logoData, 'PNG', leftX, cursorY - 4, imgW, imgH); } catch {}
        leftX += imgW + 10;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(`${brandName}`, leftX, cursorY + 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      cursorY += 14;
      doc.text(`Conta: ${accountEmail ?? '—'}`, leftX, cursorY + 2);
      cursorY += 12;
      doc.text(`Código: ${reportCode}`, leftX, cursorY + 2);

      // Título do relatório
      cursorY += 18;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`Relatório — ${periodLabel}`, marginX, cursorY);
      doc.setFont("helvetica", "normal");

      // KPIs
      cursorY += 18;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Resumo", marginX, cursorY);

      const closed = filtered.trades.filter(t => !!t.closedAt);
      const totalTrades = filtered.trades.length;
      const closedCount = closed.length;
      const longCount = filtered.trades.filter(t => (t.side || "").toLowerCase() === "long").length;
      const shortCount = filtered.trades.filter(t => (t.side || "").toLowerCase() === "short").length;
      const totalFees = filtered.trades.reduce((a, t) => a + (t.fees ?? 0), 0);
      const avgR = (() => {
        const rs = closed.map(t => t.r).filter((r: any): r is number => typeof r === "number" && isFinite(r));
        return rs.length ? rs.reduce((a: number, b: number) => a + b, 0) / rs.length : undefined;
      })();
      const effectiveDays = filtered.daily;
      const bestDay = effectiveDays.reduce<any>((best, d) => (!best || d.pnl > best.pnl) ? d : best, null);
      const worstDay = effectiveDays.reduce<any>((worst, d) => (!worst || d.pnl < worst.pnl) ? d : worst, null);
      const maxDD = effectiveDays.length ? Math.min(...effectiveDays.map(d => d.dd)) : 0;

      autoTable(doc, {
        startY: cursorY + 8,
        head: [["Indicador", "Valor"]],
        body: [
          ["Saldo inicial", fmtMoney(user.startingBalance, currency)],
          ["Saldo atual", fmtMoney(user.currentBalance, currency)],
          ["PnL do período", fmtMoney(filtered.monthPnL, currency)],
          ["Despesas do período (estim.)", fmtMoney(filtered.expenses, currency)],
          ["Payout estimado (35%)", fmtMoney(Math.max(0, (filtered.monthPnL - filtered.expenses) * 0.35), currency)],
          ["Cashflow do período", fmtMoney(filtered.cfTotal, currency)],
          ["Win rate do período", `${filtered.winRate.toFixed(2)}%`],
          ["Trades (totais / fechados)", `${totalTrades} / ${closedCount}`],
          ["Long / Short", `${longCount} / ${shortCount}`],
          ["Comissões", fmtMoney(totalFees, currency)],
          ["R médio (fechados)", avgR == null ? "—" : avgR.toFixed(2)],
          ["Melhor dia", bestDay ? `${bestDay.key} • ${fmtMoney(bestDay.pnl, currency)}` : "—"],
          ["Pior dia", worstDay ? `${worstDay.key} • ${fmtMoney(worstDay.pnl, currency)}` : "—"],
          ["Max drawdown (período)", fmtMoney(maxDD, currency)],
        ],
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [243, 244, 246], textColor: 0 },
        theme: "grid",
        margin: { left: marginX, right: marginX },
      });

      cursorY = (doc as any).lastAutoTable.finalY + 16;

      // Daily breakdown — só dias com trades
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Quebra diária", marginX, cursorY);
      autoTable(doc, {
        startY: cursorY + 8,
        head: [["Dia", "Trades", "PnL", "Δ% cumul", "DD cumul"]],
        body: filtered.daily.map(d => [
          d.key,
          String(d.trades),
          fmtMoney(d.pnl, currency),
          `${(d.pctCumul ?? 0).toFixed(2)}%`,
          fmtMoney(d.dd, currency),
        ]),
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [243, 244, 246], textColor: 0 },
        theme: "grid",
        margin: { left: marginX, right: marginX },
      });

      // Trades highlights
      const bestTrade = closed.reduce<any>((best, t) => (best == null || (t.pnl ?? -Infinity) > (best.pnl ?? -Infinity)) ? t : best, null);
      const worstTrade = closed.reduce<any>((worst, t) => (worst == null || (t.pnl ?? Infinity) < (worst.pnl ?? Infinity)) ? t : worst, null);
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 16,
        head: [["Destaque", "Info", "PnL"]],
        body: [
          [
            "Melhor trade",
            bestTrade ? `${bestTrade.symbol ?? "—"} • ${bestTrade.closedAt ? new Date(bestTrade.closedAt).toLocaleString("pt-PT") : "—"}` : "—",
            bestTrade ? fmtMoney(bestTrade.pnl ?? 0, currency) : "",
          ],
          [
            "Pior trade",
            worstTrade ? `${worstTrade.symbol ?? "—"} • ${worstTrade.closedAt ? new Date(worstTrade.closedAt).toLocaleString("pt-PT") : "—"}` : "—",
            worstTrade ? fmtMoney(worstTrade.pnl ?? 0, currency) : "",
          ],
        ],
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [243, 244, 246], textColor: 0 },
        theme: "grid",
        margin: { left: marginX, right: marginX },
      });

      // Cashflows do período
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 16,
        head: [["Data", "Tipo", "Nota", "Montante"]],
        body: filtered.cashflows.length === 0 ? [] : filtered.cashflows.map((c: any) => [
          c.ts ? new Date(c.ts).toLocaleString("pt-PT") : (c.date ? new Date(c.date).toLocaleString("pt-PT") : "—"),
          c.type ?? c.kind ?? "—",
          (c.note ?? c.description ?? "").toString(),
          fmtMoney(c.amount ?? 0, currency),
        ]),
        didDrawPage: () => {
          // footer per page
          const page = (doc as any).getCurrentPageInfo ? (doc as any).getCurrentPageInfo().pageNumber : doc.getNumberOfPages();
          const pages = doc.getNumberOfPages();
          doc.setFontSize(9);
          doc.setTextColor(120);
          doc.text(`Relatório — ${periodLabel}`, marginX, pageHeight - 16);
          doc.text(`${page} / ${pages}`, pageWidth - marginX, pageHeight - 16, { align: "right" });
        },
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [243, 244, 246], textColor: 0 },
        theme: "grid",
        margin: { left: marginX, right: marginX },
      });

      doc.save(`relatorio-${toYMD(startDate)}_${toYMD(endDate)}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Falhou a geração do PDF. Certifica-te que tens 'jspdf' e 'jspdf-autotable' instalados (npm i jspdf jspdf-autotable).");
    }
  };

  return (
    <div className="card">
      <h3 className="font-bold mb-2">Exportações — {periodLabel}</h3>

      {/* Controlo de intervalo */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-3">
        {/* Modo (segmented) */}
        <div>
          <div className="inline-flex rounded-xl border border-gray-700/40 overflow-hidden">
            <button
              type="button"
              aria-pressed={mode==='day'}
              onClick={()=>setMode('day')}
              className={`px-4 py-2 text-sm transition ${mode==='day' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}
            >Dia</button>
            <button
              type="button"
              aria-pressed={mode==='month'}
              onClick={()=>setMode('month')}
              className={`px-4 py-2 text-sm transition border-l border-gray-700/40 ${mode==='month' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}
            >Mês</button>
            <button
              type="button"
              aria-pressed={mode==='range'}
              onClick={()=>setMode('range')}
              className={`px-4 py-2 text-sm transition border-l border-gray-700/40 ${mode==='range' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}
            >Personalizado</button>
          </div>
        </div>

        {/* Inputs do período (condicionais) */}
        <div className="flex flex-wrap items-center gap-2">
          {mode==='day' && (
            <div className="flex items-center gap-2">
              <input aria-label="Dia do relatório" type="date" className="input input-bordered" value={dayInput} onChange={e=>setDayInput(e.target.value)} />
              <button className="btn btn-sm" type="button" onClick={()=>{ setDayInput(toYMD(new Date())); }}>Hoje</button>
            </div>
          )}
          {mode==='month' && (
            <input aria-label="Mês do relatório" type="month" className="input input-bordered" value={monthInput} onChange={e=>setMonthInput(e.target.value)} />
          )}
          {mode==='range' && (
            <div className="flex items-center gap-2">
              <input aria-label="Início" type="date" className="input input-bordered" value={startInput} onChange={e=>setStartInput(e.target.value)} />
              <span>—</span>
              <input aria-label="Fim" type="date" className="input input-bordered" value={endInput} onChange={e=>setEndInput(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn" onClick={saveCsv}>Exportar CSV</button>
        <button className="btn" onClick={saveTxt}>Exportar TXT</button>
        <button className="btn" onClick={downloadPdf}>Exportar PDF</button>
        <button className="btn-ghost" onClick={copyTxt}>Copiar texto</button>
      </div>
    </div>
  );
}
