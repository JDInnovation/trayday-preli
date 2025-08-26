"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  CartesianGrid,
} from "recharts";

type Item = {
  key: string;       // índice/ordem da trade no mês
  pnl: number;       // PnL da trade (fechada)
  open: number;      // acumulado antes da trade
  close: number;     // acumulado depois da trade
  high: number;      // max(open, close)
  low: number;       // min(open, close)
  date?: number;     // timestamp do fecho (opcional, só para tooltip)
};

export default function TradeCandles({
  data,
  currency = "EUR",
}: {
  data: Item[];
  currency?: string;
}) {
  return (
    <div className="card">
      <h3 className="font-semibold mb-2">Velas por trade (PnL de cada ordem fechada)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="key" />
            <YAxis />
            <ReferenceLine y={0} strokeOpacity={0.5} />
            <Tooltip
              formatter={(v: any, n: any, p: any) => {
                if (n === "pnl") {
                  return [
                    (v as number).toLocaleString(undefined, {
                      style: "currency",
                      currency,
                    }),
                    "PnL",
                  ];
                }
                return [v, n];
              }}
              labelFormatter={(label: any, payload: any) => {
                if (!payload?.[0]) return label;
                const it = payload[0].payload as Item;
                const fmt = (x: number) =>
                  x.toLocaleString(undefined, { style: "currency", currency });
                const d =
                  it.date ? new Date(it.date).toLocaleDateString() : "—";
                return `#${label} • ${d}\nopen: ${fmt(it.open)}  →  close: ${fmt(
                  it.close
                )}`;
              }}
            />
            <Bar dataKey="pnl">
              {data.map((d, i) => (
                <Cell key={i} className={d.pnl >= 0 ? "fill-ok" : "fill-danger"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="small text-sub mt-2">
        Cada barra representa o PnL de uma trade fechada do mês, iniciando o acumulado em 0.
      </p>
    </div>
  );
}
