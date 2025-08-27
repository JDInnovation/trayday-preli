"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Calendar, CalendarClock, Clock, Rows3, LineChart as LineChartIcon } from "lucide-react";

export type TimeframeMode = "day" | "week" | "month" | "year" | "custom";

export type Timeframe = {
  mode: TimeframeMode;
  start: Date;
  end: Date; // end incluído até 23:59:59.999
  label: string;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function startOfWeekISO(d: Date) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // 0=Mon
  x.setDate(x.getDate() - day);
  return x;
}
function endOfWeekISO(d: Date) {
  const s = startOfWeekISO(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
}
function endOfYear(d: Date) {
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
}

function makeLabel(tf: Timeframe): string {
  const d = (x: Date) =>
    `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}/${x.getFullYear()}`;
  switch (tf.mode) {
    case "day":
      return `Hoje (${d(tf.start)})`;
    case "week":
      return `Semana (${d(tf.start)} – ${d(tf.end)})`;
    case "month":
      return `Mês (${d(tf.start)} – ${d(tf.end)})`;
    case "year":
      return `Ano (${tf.start.getFullYear()})`;
    case "custom":
      return `Personalizado (${d(tf.start)} – ${d(tf.end)})`;
  }
}

export default function TimeframeSelector({
  onChange,
  initialMode = "month",
}: {
  onChange: (tf: Timeframe) => void;
  initialMode?: TimeframeMode;
}) {
  const [mode, setMode] = useState<TimeframeMode>(initialMode);
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  const tf = useMemo<Timeframe>(() => {
    const now = anchor;
    let start = new Date(), end = new Date();
    switch (mode) {
      case "day":
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case "week":
        start = startOfWeekISO(now);
        end = endOfWeekISO(now);
        break;
      case "month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "year":
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      case "custom":
        start = customStart ? startOfDay(new Date(customStart)) : startOfDay(now);
        end = customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now);
        break;
    }
    return { mode, start, end, label: "" };
  }, [mode, anchor, customStart, customEnd]);

  useEffect(() => {
    onChange({ ...tf, label: makeLabel(tf) });
  }, [tf, onChange]);

  return (
    <div className="card">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <Seg onClick={() => setMode("day")} active={mode === "day"} icon={<Clock className="w-4 h-4" />} text="Dia" />
          <Seg onClick={() => setMode("week")} active={mode === "week"} icon={<CalendarClock className="w-4 h-4" />} text="Semana" />
          <Seg onClick={() => setMode("month")} active={mode === "month"} icon={<Calendar className="w-4 h-4" />} text="Mês" />
          <Seg onClick={() => setMode("year")} active={mode === "year"} icon={<Rows3 className="w-4 h-4" />} text="Ano" />
          <Seg onClick={() => setMode("custom")} active={mode === "custom"} icon={<LineChartIcon className="w-4 h-4" />} text="Personalizado" />
        </div>

        {/* Âncora altera o “Dia/Semana/Mês/Ano” */}
        <div className="flex items-center gap-2">
          <label className="text-sub small">Âncora:</label>
          <input
            type="date"
            className="input"
            value={`${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}-${String(anchor.getDate()).padStart(2, "0")}`}
            onChange={(e) => setAnchor(new Date(e.target.value))}
          />
        </div>
      </div>

      {mode === "custom" && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <label className="text-sub small w-24">Início:</label>
            <input type="date" className="input w-full" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sub small w-24">Fim:</label>
            <input type="date" className="input w-full" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Seg({
  active,
  icon,
  text,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`px-3 py-1.5 rounded-lg border ${active ? "bg-slate-800 border-slate-600" : "bg-slate-900/50 border-slate-800 hover:bg-slate-800/60"}`}
      onClick={onClick}
      type="button"
    >
      <span className="inline-flex items-center gap-2 text-sm">
        {icon}
        {text}
      </span>
    </button>
  );
}
