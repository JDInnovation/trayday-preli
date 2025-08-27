"use client";

import { LineChart as LineIcon, TrendingUp } from "lucide-react";

export default function KpiCard({
  label,
  value,
  suffix,
  tone,
  onOpen,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  tone?: "pos" | "neg";
  onOpen?: () => void;
}) {
  const color =
    typeof value === "number"
      ? tone === "pos"
        ? "text-ok"
        : tone === "neg"
        ? "text-danger"
        : "text-slate-200"
      : tone === "neg"
      ? "text-danger"
      : tone === "pos"
      ? "text-ok"
      : "text-slate-200";

  return (
    <div className="rounded-xl border border-line bg-slate-900/40 p-2 md:p-3 min-w-0 text-center relative">
      <div className="text-sub text-[11px] md:text-xs leading-tight truncate">{label}</div>
      <div
        className={`font-semibold ${color} text-sm md:text-base leading-tight whitespace-nowrap truncate`}
        title={String(value)}
      >
        {typeof value === "number" ? value.toFixed(2) : value}
        {suffix ? <span className="text-sub ml-1">{suffix}</span> : null}
      </div>
      {onOpen && (
        <button
          className="absolute top-2 right-2 text-sub hover:text-slate-200"
          onClick={onOpen}
          aria-label="Ver gráfico"
          title="Ver gráfico"
        >
          <LineIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
