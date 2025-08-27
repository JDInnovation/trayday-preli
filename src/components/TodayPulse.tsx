"use client";

import { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { fmtMoney, ymd } from "@/lib/utils";
import type { Trade } from "@/lib/types";

export default function TodayPulse({
  trades,
  currency,
}: {
  trades: Trade[];
  currency: string;
}) {
  // trades fechadas de hoje
  const { pnlToday, series } = useMemo(() => {
    const todayKey = ymd(new Date());
    const list = trades
      .filter((t) => t.status === "closed" && t.closedAt && ymd(new Date(t.closedAt)) === todayKey)
      .sort((a, b) => (a.closedAt! - b.closedAt!));

    let acc = 0;
    const s: { i: number; v: number }[] = [];
    list.forEach((t, idx) => {
      acc += t.pnl || 0;
      s.push({ i: idx + 1, v: acc });
    });
    if (s.length === 0) {
      // mantém gráfico estável quando não houve trades
      s.push({ i: 0, v: 0 }, { i: 1, v: 0 });
    }
    return { pnlToday: acc, series: s };
  }, [trades]);

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <div className="small text-sub">Sessão de hoje</div>
          <div className={`font-semibold ${pnlToday >= 0 ? "text-ok" : "text-danger"}`}>
            {fmtMoney(pnlToday, currency)}
          </div>
        </div>
        <div className="text-right">
          <div className="small text-sub">Trades</div>
          <div className="font-semibold">{Math.max(0, series.length - 1)}</div>
        </div>
      </div>

      <div className="h-24 md:h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <XAxis dataKey="i" hide />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              formatter={(v: number) => [fmtMoney(v, currency), "Acumulado"]}
              labelFormatter={(label: number | string) => `Trade #${label}`}
            />
            <ReferenceLine y={0} strokeOpacity={0.5} />
            <Line type="monotone" dataKey="v" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
