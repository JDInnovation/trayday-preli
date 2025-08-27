"use client";

import { useMemo } from "react";
import { Trade } from "@/lib/types";
import { ymd, fmtMoney } from "@/lib/utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";

export default function TodayPulse({
  trades,
  currency,
}: {
  trades: Trade[];
  currency: string;
}) {
  const todayKey = ymd(new Date());

  const { pnlToday, nToday, series } = useMemo(() => {
    const closedToday = trades
      .filter(
        (t) =>
          t.status === "closed" &&
          t.closedAt &&
          ymd(new Date(t.closedAt)) === todayKey
      )
      .sort((a, b) => (a.closedAt! - b.closedAt!));

    let acc = 0;
    const seq = [{ i: 0, v: 0 }];
    closedToday.forEach((t, idx) => {
      acc += t.pnl || 0;
      seq.push({ i: idx + 1, v: acc });
    });
    if (seq.length === 1) seq.push({ i: 1, v: 0 });

    const sum = closedToday.reduce((a, t) => a + (t.pnl || 0), 0);
    return { pnlToday: sum, nToday: closedToday.length, series: seq };
  }, [trades, todayKey]);

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-semibold">Hoje</h4>
        <span className="text-sub text-xs">{nToday} {nToday === 1 ? "trade" : "trades"}</span>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <div className={`font-bold ${pnlToday >= 0 ? "text-ok" : "text-danger"} text-lg`}>
          {fmtMoney(pnlToday, currency)}
        </div>
        <div className="small text-sub">PnL</div>
      </div>

      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <XAxis dataKey="i" hide />
            <YAxis domain={["auto", "auto"]} hide />
            <Tooltip
              formatter={(v: number) => [fmtMoney(v, currency), "Acumulado"]}
              labelFormatter={(i) => `Trade #${i}`}
            />
            <ReferenceLine y={0} strokeOpacity={0.5} />
            <Line type="monotone" dataKey="v" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="small text-sub mt-2">
        Acumulado por trade fechada durante o dia.
      </div>
    </div>
  );
}
