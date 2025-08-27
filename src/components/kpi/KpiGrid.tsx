"use client";

import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, ReferenceLine } from "recharts";
import KpiCard from "./KpiCard";
import KpiModal from "./KpiModal";
import { ChartData, KpiCharts, KpiValue } from "@/lib/kpis";
import { fmtMoney } from "@/lib/utils";

function ChartLine({ data, ySuffix = "", percent = false }: { data: ChartData; ySuffix?: string; percent?: boolean }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="x" />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(x: number) => (percent ? `${x}%` : x)}
          />
          <Tooltip
            formatter={(v: number) => (percent ? `${v.toFixed(2)}%` : v.toFixed(2))}
            labelFormatter={(l: any) => String(l)}
          />
          <ReferenceLine y={0} strokeOpacity={0.5} />
          <Line type="monotone" dataKey="y" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartBars({ data, valueFmt }: { data: ChartData; valueFmt?: (v: number) => string }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="x" />
          <YAxis />
          <Tooltip
            formatter={(v: number) => (valueFmt ? valueFmt(v) : String(v))}
            labelFormatter={(l: any) => String(l)}
          />
          <ReferenceLine y={0} strokeOpacity={0.5} />
          <Bar dataKey="y" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function KpiGrid({
  kpis,
  charts,
  currency,
}: {
  kpis: KpiValue[];
  charts: KpiCharts;
  currency: string;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const current = useMemo(() => kpis.find((k) => k.key === openKey), [openKey, kpis]);

  return (
    <>
      {/* 10 KPIs: 2 por linha em mobile, 5 por linha em xl */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <KpiCard
            key={k.key}
            label={k.label}
            value={typeof k.value === "number" ? k.value : k.value}
            suffix={k.suffix}
            tone={k.tone}
            onOpen={() => setOpenKey(k.key)}
          />
        ))}
      </div>

      <KpiModal
        open={!!current}
        title={current ? current.label : ""}
        description={current ? current.description : ""}
        onClose={() => setOpenKey(null)}
      >
        {current ? renderChart(current.key as any, charts, currency) : null}
      </KpiModal>
    </>
  );
}

function renderChart(key: string, charts: KpiCharts, currency: string) {
  switch (key) {
    case "pnl":
      return <ChartLine data={charts.pnl || []} />;
    case "retPct":
      return <ChartLine data={charts.retPct || []} percent />;
    case "tradesCount":
      return <ChartBars data={charts.tradesCount || []} />;
    case "winRate":
      return <ChartLine data={charts.winRate || []} percent />;
    case "expectancy":
      return <ChartBars data={charts.expectancy || []} valueFmt={(v) => String(v)} />;
    case "profitFactor":
      return (
        <ChartBars
          data={charts.profitFactor || []}
          valueFmt={(v) => fmtMoney(v, currency)}
        />
      );
    case "maxDD":
      return <ChartLine data={charts.maxDD || []} />;
    case "avgPerSession":
      return <ChartBars data={charts.avgPerSession || []} valueFmt={(v) => fmtMoney(v, currency)} />;
    case "streak":
      return <ChartLine data={charts.streak || []} />;
    case "riskViolations":
      return <ChartBars data={charts.riskViolations || []} />;
    default:
      return null;
  }
}
