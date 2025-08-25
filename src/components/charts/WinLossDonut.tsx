"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function WinLossDonut({ wins, losses }: { wins: number; losses: number }) {
  const data = [
    { name: "Wins", value: wins },
    { name: "Losses", value: losses }
  ];
  const colors = ["#22c55e", "#ef4444"];
  return (
    <div className="card h-72">
      <h4 className="mb-2 font-semibold">Win / Loss</h4>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie data={data} innerRadius={"55%"} dataKey="value">
            {data.map((_, i) => <Cell key={i} fill={colors[i]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
