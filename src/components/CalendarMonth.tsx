"use client";

import { MonthAggDay } from "@/lib/types";
import { monthLabel, pad2 } from "@/lib/utils";

export default function CalendarMonth({
  y, m, daily, currency, onPrev, onNext, onPickMonth, onAnnual
}: {
  y: number; m: number; daily: MonthAggDay[]; currency: string;
  onPrev: () => void; onNext: () => void; onPickMonth: (y: number, m: number) => void; onAnnual: () => void;
}) {
  const labels = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
  const mv = `${y}-${pad2(m+1)}`;
  const s = new Date(y, m, 1);
  const startOffset = (s.getDay() + 6) % 7;
  const blanks = Array.from({ length: startOffset }, () => <div key={crypto.randomUUID()} />);

  return (
    <div className="card" id="calendarCard">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-ghost" onClick={onPrev}>«</button>
          <input className="input" type="month" value={mv} onChange={e => {
            const [yy, mm] = e.target.value.split("-").map(v => parseInt(v, 10));
            onPickMonth(yy, mm - 1);
          }} />
          <button className="btn-ghost" onClick={onNext}>»</button>
          <span className="small">Legenda: Δ% cumul = % vs. início; DD = drawdown cumulativo</span>
        </div>
        <div><button className="btn" onClick={onAnnual}>Performance anual</button></div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {labels.map(l => <div key={l} className="text-center text-sub text-xs">{l}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-3">
        {blanks}
        {daily.map(d => {
          const posNeg = d.pnl > 0 ? "outline outline-1 outline-ok/40" : d.pnl < 0 ? "outline outline-1 outline-danger/40" : "";
          const cls = `border border-line rounded-xl p-3 bg-[#0f172a] min-h-[140px] flex flex-col gap-1 ${d.hasTrades ? posNeg : "opacity-60"} ${d.isToday ? "ring-2 ring-brand" : ""}`;
          return (
            <div key={d.key} className={cls}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-400">{d.date.getDate()}</span>
                <span className="small">{d.trades} {d.trades === 1 ? "trade" : "trades"}</span>
              </div>
              {d.hasTrades ? (
                <>
                  <div className="small">Δ% cumul: <b className={d.pctCumul >= 0 ? "text-ok" : "text-danger"}>{d.pctCumul.toFixed(2)}%</b></div>
                  <div className="small">PnL dia: <b className={d.pnl >= 0 ? "text-ok" : "text-danger"}>{d.pnl.toFixed(2)}</b></div>
                  <div className="small">DD (cum.): <b className="text-danger">{d.dd.toFixed(2)}</b></div>
                </>
              ) : (
                <>
                  <div className="small text-slate-400">Sem trades</div>
                  <div className="small text-slate-400">Δ% cumul: —</div>
                  <div className="small text-slate-400">PnL dia: —</div>
                  <div className="small text-slate-400">DD (cum.): —</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
