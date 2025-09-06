"use client";

import { useMemo, useState } from "react";
import { Check, Lock, Shield, Star, HelpCircle, Clock } from "lucide-react";
import Link from "next/link";

/** 1) Social Proof */
function SocialProof() {
  return (
    <section className="mt-8 md:mt-10">
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 md:p-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-white/60">
            Confiado por traders que valorizam dados e execução.
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xl font-bold">97%</div>
              <div className="text-xs text-white/60">Satisfação</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">10 KPIs</div>
              <div className="text-xs text-white/60">Ação imediata</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">24/7</div>
              <div className="text-xs text-white/60">Disponível</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** 2) ROI Block (mini calculadora simples) */
function ROIBlock() {
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(4);
  const [valuePerHour, setValuePerHour] = useState<number>(25);

  const monthlyValue = useMemo(() => {
    const weeks = 4.3; // média mensal
    const saved = hoursPerWeek * weeks * valuePerHour;
    return Math.max(0, Math.round(saved));
  }, [hoursPerWeek, valuePerHour]);

  return (
    <section className="mt-6 md:mt-8 grid md:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 md:p-5">
        <h3 className="font-semibold text-lg">Quanto vale poupar tempo?</h3>
        <p className="text-sm text-white/70 mt-1">
          Estima o impacto mensal de automatizar registos, métricas e análises.
        </p>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <label className="text-xs text-white/60">Horas/semana</label>
            <input
              type="number"
              min={0}
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              className="mt-1 w-full rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 focus:outline-none focus:ring-white/20"
            />
          </div>
          <div>
            <label className="text-xs text-white/60">Valor/hora (€)</label>
            <input
              type="number"
              min={0}
              value={valuePerHour}
              onChange={(e) => setValuePerHour(Number(e.target.value))}
              className="mt-1 w-full rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 focus:outline-none focus:ring-white/20"
            />
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-[#7558E4]/10 ring-1 ring-[#7558E4]/20 p-3">
          <div className="text-sm text-white/80">Valor estimado/mês</div>
          <div className="text-2xl font-bold">€{monthlyValue}</div>
          <div className="text-xs text-white/60 mt-1">
            * Estimativa. Resultados variam por rotina e disciplina.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 md:p-5">
        <h3 className="font-semibold text-lg">Porquê agora?</h3>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <Clock className="w-4 h-4 mt-0.5 text-white/60" />
            <span>Menos fricção na execução diária (registo, análise, decisões).</span>
          </li>
          <li className="flex items-start gap-2">
            <Star className="w-4 h-4 mt-0.5 text-white/60" />
            <span>KPIs com contexto — evolução por dia, semana, mês e ano.</span>
          </li>
          <li className="flex items-start gap-2">
            <Shield className="w-4 h-4 mt-0.5 text-white/60" />
            <span>Base para integrações e automações (Pro/Elite).</span>
          </li>
        </ul>
        <div className="mt-4 text-xs text-white/50">
          Dica: começa no <b>Pro</b> e evolui para <b>Elite</b> quando precisares.
        </div>
      </div>
    </section>
  );
}

/** 3) Tabela de comparação */
function FeatureMatrix() {
  const Row = ({
    label,
    starter,
    pro,
    elite,
  }: {
    label: string;
    starter?: boolean | string;
    pro?: boolean | string;
    elite?: boolean | string;
  }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-center py-2 border-b border-white/5">
      <div className="text-sm text-white/80">{label}</div>
      <div className="text-sm text-white/70 md:text-center">
        {starter === true ? <Check className="w-4 h-4 inline" /> : starter || "—"}
      </div>
      <div className="text-sm text-white/70 md:text-center">
        {pro === true ? <Check className="w-4 h-4 inline" /> : pro || "—"}
      </div>
      <div className="text-sm text-white/70 md:text-center">
        {elite === true ? <Check className="w-4 h-4 inline" /> : elite || "—"}
      </div>
    </div>
  );

  return (
    <section className="mt-8 md:mt-10">
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 md:p-5">
        <h3 className="font-semibold text-lg">Comparação rápida</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-white/60 mt-3 mb-2">
          <div />
          <div>Starter</div>
          <div>Pro</div>
          <div>Elite</div>
        </div>

        <div className="divide-y divide-white/5">
          <Row label="KPIs e gráficos" starter="Base" pro="Avançado" elite="Completo" />
          <Row label="Timeframes dinâmicos" starter={true} pro={true} elite={true} />
          <Row label="Exportação CSV" starter={true} pro="Avançada" elite="Avançada +" />
          <Row label="Integrações externas" starter="—" pro="Beta" elite="Sim" />
          <Row label="Automação" starter="—" pro="—" elite="Roadmap" />
          <Row label="Suporte" starter="Standard" pro="Prioritário" elite="Prioritário +" />
        </div>
      </div>
    </section>
  );
}

/** 4) Depoimentos */
function Testimonials() {
  const items = [
    {
      name: "Sofia M.",
      text:
        "Deixei de perder tempo em folhas soltas. Os KPIs e o calendário mudaram o meu processo.",
    },
    {
      name: "André T.",
      text:
        "Consistência veio quando comecei a medir. A visão por sessões e metas fez a diferença.",
    },
    {
      name: "Rui C.",
      text:
        "A plataforma é rápida, clara e focada no que interessa. O Pro pagou-se no primeiro mês.",
    },
  ];
  return (
    <section className="mt-8 md:mt-10">
      <div className="grid md:grid-cols-3 gap-4">
        {items.map((t, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 md:p-5"
          >
            <div className="flex items-center gap-2 text-[#BDB1FF]">
              <Star className="w-4 h-4" />
              <Star className="w-4 h-4" />
              <Star className="w-4 h-4" />
              <Star className="w-4 h-4" />
              <Star className="w-4 h-4" />
            </div>
            <p className="text-sm text-white/80 mt-3">{t.text}</p>
            <div className="text-xs text-white/50 mt-3">— {t.name}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** 5) FAQ */
function FAQ() {
  const faqs = [
    {
      q: "Posso cancelar quando quiser?",
      a: "Sim. O cancelamento é imediato e mantém o acesso até ao fim do período pago.",
    },
    {
      q: "Preciso de cartão no Starter?",
      a: "Não. O Starter é gratuito para começar e experimentar a plataforma.",
    },
    {
      q: "Como funciona a faturação anual?",
      a: "Mostramos o preço equivalente por mês, mas a cobrança é única anual, com desconto.",
    },
    {
      q: "E se eu não gostar?",
      a: "Contacta-nos em 14 dias e devolvemos. Queremos utilizadores satisfeitos a longo prazo.",
    },
  ];
  return (
    <section className="mt-8 md:mt-10">
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-2 md:p-3">
        {faqs.map((f, i) => (
          <details
            key={i}
            className="group rounded-xl p-3 md:p-4 hover:bg-white/[0.03] transition"
          >
            <summary className="flex items-center gap-2 cursor-pointer list-none">
              <HelpCircle className="w-4 h-4 text-white/60" />
              <span className="font-medium">{f.q}</span>
            </summary>
            <p className="text-sm text-white/75 mt-2 pl-6">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** 6) Trust Bar + CTA final */
function TrustAndCTA() {
  return (
    <section className="mt-8 md:mt-10">
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 md:p-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white/70">Reembolso 14 dias</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white/70">Pagamentos seguros</span>
            </div>
          </div>

          <Link
            href="/upgrade#plans"
            className="px-4 py-2.5 rounded-xl font-medium bg-[#7558E4] text-white hover:brightness-110 ring-1 ring-white/10"
          >
            Escolher plano agora
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function PricingExtras() {
  return (
    <>
      <SocialProof />
      <ROIBlock />
      <FeatureMatrix />
      <Testimonials />
      <FAQ />
      <TrustAndCTA />
    </>
  );
}
