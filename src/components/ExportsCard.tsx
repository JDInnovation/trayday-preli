"use client";

import { Trade, Cashflow } from "@/lib/types";
import { fmtMoney, monthKey, pad2 } from "@/lib/utils";

function buildMonthlyText(
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
  lines.push(`Relatório mensal — ${monthLabel}`);
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

export default function ExportsCard({
  year, month, currency, user,
  monthLabel,
  monthPnL, expenses,
  winRate, daysLeft,
  daily,
  trades, cashflows
}: {
  year: number; month: number; currency: string;
  user: { startingBalance: number; currentBalance: number };
  monthLabel: string; monthPnL: number; expenses: number; winRate: number; daysLeft: number;
  daily: { key: string; trades: number; pnl: number; pctCumul: number; dd: number; hasTrades: boolean }[];
  trades: Trade[]; cashflows: Cashflow[];
}) {
  const cfMonthTotal = cashflows
    .filter(c => {
      const d = new Date(c.ts);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((a, c) => a + c.amount, 0);

  const txt = buildMonthlyText(
    currency, monthLabel, user.startingBalance, user.currentBalance,
    monthPnL, expenses, winRate, daysLeft, daily, cfMonthTotal
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
    trades.slice().sort((a,b) => (a.openAt||0)-(b.openAt||0)).forEach(t => {
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
        return (s.includes(",") || s.includes("\"")) ? `"${s.replace(/"/g, "\"\"")}"` : s;
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

  const printPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<pre style="font-family:system-ui, -apple-system, Segoe UI, Roboto">${txt}</pre>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="card">
      <h3 className="font-bold mb-2">Exportações — {monthLabel}</h3>
      <div className="flex flex-wrap gap-2">
        <button className="btn" onClick={saveCsv}>Exportar CSV</button>
        <button className="btn" onClick={saveTxt}>Exportar TXT</button>
        <button className="btn" onClick={printPdf}>Exportar PDF</button>
        <button className="btn-ghost" onClick={copyTxt}>Copiar texto</button>
      </div>
    </div>
  );
}
