"use client";

import React from "react";
import { CalendarCheck, FileSpreadsheet, LineChart } from "lucide-react";

type Feature = {
  icon: React.ReactNode;
  title: string;
  highlight?: string;
  desc: string;
};

const features: Feature[] = [
  {
    icon: <LineChart className="w-5 h-5" />,
    title: "KPIs",
    highlight: "10 métricas chave",
    desc: "KPIs acionáveis com gráficos e contexto para decisões rápidas.",
  },
  {
    icon: <CalendarCheck className="w-5 h-5" />,
    title: "Sessões",
    highlight: "Resultados por dia",
    desc: "Resumo diário e por trade com histórico pesquisável.",
  },
  {
    icon: <FileSpreadsheet className="w-5 h-5" />,
    title: "Exporta",
    highlight: "CSV e texto",
    desc: "Exporta tudo em 1 clique e simula levantamentos com segurança.",
  },
];

function FeatureCard({ icon, title, highlight, desc }: Feature) {
  return (
    <div
      className="mt-3 md:mt-4 group h-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur
                 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]
                 hover:shadow-[0_16px_36px_-12px_rgba(0,0,0,0.6)]
                 transition-all duration-300 overflow-hidden"
      role="listitem"
    >
      <div className="p-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="shrink-0 grid place-items-center w-9 h-9 rounded-xl
                       bg-gradient-to-br from-[#7558E4]/22 to-fuchsia-500/15
                       ring-1 ring-[#7558E4]/30 text-[#7558E4]"
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="font-semibold leading-tight truncate">{title}</div>
            {highlight && (
              <div className="text-[11px] text-white/60">{highlight}</div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="mt-3 text-sm text-white/75 leading-relaxed">
          {desc}
        </div>

        {/* Subtle divider */}
        <div className="mt-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Footer note */}
        <div className="mt-3 text-[11px] text-white/45">
          Foco em performance
        </div>
      </div>
    </div>
  );
}

export default function FeatureCards({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-3 gap-3 md:gap-4 items-stretch ${className}`}
      role="list"
      aria-label="Principais benefícios"
    >
      {features.map((f, i) => (
        <FeatureCard key={i} {...f} />
      ))}
    </div>
  );
}
