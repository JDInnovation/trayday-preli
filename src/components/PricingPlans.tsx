"use client";

import { useMemo, useState } from "react";
import { Check, X, Crown, Rocket, Sparkles } from "lucide-react";
import Link from "next/link";

type Billing = "monthly" | "yearly";

type Plan = {
  id: "starter" | "pro" | "elite";
  name: string;
  tagline: string;
  badge?: string;
  priceMonthly: number; // 0 para gratuito
  priceYearly: number;  // total / mês apresentado (ex.: 20 => “20/mês” faturado anualmente)
  cta: string;
  features: string[];
  limitations?: string[];
};

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Começa sem fricção",
    priceMonthly: 0,
    priceYearly: 0,
    cta: "Continuar grátis",
    features: [
      "Dashboard base e 10 KPIs",
      "Calendário e registo de trades",
      "Exportação CSV",
    ],
    limitations: ["Sem integrações externas", "Sem automações"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Para traders consistentes",
    badge: "Mais Popular",
    priceMonthly: 14,
    priceYearly: 12, // mostramos “12/mês” cobrado anualmente
    cta: "Fazer upgrade para Pro",
    features: [
      "KPIs avançados + gráficos interativos",
      "Timeframes dinâmicos (dia/semana/mês/ano/custom)",
      "Objetivos de risco/retorno e alertas",
      "Exportação avançada e notas de sessão",
      "Suporte prioritário",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    tagline: "Ferramentas para escalar",
    priceMonthly: 29,
    priceYearly: 24,
    cta: "Fazer upgrade para Elite",
    features: [
      "Tudo no Pro",
      "Integrações (brokers/APIs) *",
      "Automação de entradas/saídas *",
      "Relatórios custom e partilha segura",
      "Workspaces/Equipa *",
    ],
    limitations: ["* Funcionalidades em rollout progressivo"],
  },
];

export default function PricingPlans() {
  const [billing, setBilling] = useState<Billing>("monthly");

  const priceLabel = (p: Plan) => {
    if (p.priceMonthly === 0) return "Grátis";
    const v = billing === "monthly" ? p.priceMonthly : p.priceYearly;
    const suffix =
      billing === "monthly" ? "/mês" : "/mês • faturado anualmente";
    return `€${v}${suffix}`;
    // Nota: quando integrares Stripe, este valor é apenas visual.
  };

  const savingBadge = useMemo(() => {
    return billing === "yearly" ? (
      <span className="ml-2 rounded-full px-2 py-0.5 text-[11px] bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20">
        Poupas ~15%
      </span>
    ) : null;
  }, [billing]);

  const handleSelect = (plan: Plan) => {
    // Placeholder – quando integrares Stripe:
    // 1) faz POST para /api/checkout com { planId: plan.id, billing }
    // 2) redireciona para URL de checkout devolvida
    alert(
      `Plano selecionado: ${plan.name} (${billing === "monthly" ? "Mensal" : "Anual"})\n\n` +
        "Integra o Stripe Checkout em /api/checkout para finalizar."
    );
  };

  return (
    <section>
      {/* Toggle mensal/anual */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <button
          className={`text-sm px-3 py-1.5 rounded-lg ring-1 transition ${
            billing === "monthly"
              ? "bg-white/10 ring-white/20"
              : "ring-white/10 text-white/60 hover:text-white"
          }`}
          onClick={() => setBilling("monthly")}
        >
          Mensal
        </button>
        <button
          className={`text-sm px-3 py-1.5 rounded-lg ring-1 transition ${
            billing === "yearly"
              ? "bg-white/10 ring-white/20"
              : "ring-white/10 text-white/60 hover:text-white"
          }`}
          onClick={() => setBilling("yearly")}
        >
          Anual {savingBadge}
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        {PLANS.map((p) => {
          const isPro = p.id === "pro";
          const accent =
            p.id === "starter"
              ? "from-white/4 to-white/2"
              : p.id === "pro"
              ? "from-[#7558E4]/20 to-sky-500/10"
              : "from-amber-400/15 to-pink-500/10";
          const icon =
            p.id === "starter" ? (
              <Sparkles className="w-4 h-4" />
            ) : p.id === "pro" ? (
              <Rocket className="w-4 h-4" />
            ) : (
              <Crown className="w-4 h-4" />
            );

          return (
            <div
              key={p.id}
              className={`relative rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur p-4 md:p-5
                          shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] hover:shadow-[0_16px_36px_-12px_rgba(0,0,0,0.6)]
                          transition-all group overflow-hidden`}
            >
              {/* Glow */}
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-100 transition duration-300`}
              />

              {/* Badge */}
              {p.badge && (
                <div className="absolute top-3 right-3 text-[11px] rounded-full px-2 py-0.5 bg-[#7558E4]/20 text-[#BDB1FF] ring-1 ring-[#7558E4]/30">
                  {p.badge}
                </div>
              )}

              {/* Head */}
              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="grid place-items-center w-8 h-8 rounded-xl bg-[#7558E4]/20 text-[#BDB1FF] ring-1 ring-[#7558E4]/25">
                    {icon}
                  </div>
                  <div>
                    <div className="font-semibold leading-tight">{p.name}</div>
                    <div className="text-xs text-white/60">{p.tagline}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-2xl font-bold">{priceLabel(p)}</div>
                  {p.priceMonthly > 0 && billing === "yearly" && (
                    <div className="text-xs text-white/45">
                      Cobrança anual consolidada
                    </div>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="relative mt-4 space-y-2">
                {p.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 mt-0.5 text-emerald-300" />
                    <span className="text-white/80">{f}</span>
                  </li>
                ))}
                {p.limitations?.map((f, i) => (
                  <li key={`l-${i}`} className="flex items-start gap-2 text-sm">
                    <X className="w-4 h-4 mt-0.5 text-white/40" />
                    <span className="text-white/50">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="relative mt-5">
                <button
                  onClick={() => handleSelect(p)}
                  className={`w-full px-4 py-2.5 rounded-xl font-medium transition
                    ring-1 ring-white/10
                    ${
                      isPro
                        ? "bg-[#7558E4] text-white hover:brightness-110"
                        : "bg-white/10 hover:bg-white/15"
                    }`}
                >
                  {p.cta}
                </button>

                {/* Link para termos / info faturação */}
                <div className="text-[11px] text-white/40 mt-2 text-center">
                  <Link href="/terms" className="hover:text-white/70">
                    Termos
                  </Link>{" "}
                  •{" "}
                  <Link href="/privacy" className="hover:text-white/70">
                    Privacidade
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Nota stripe */}
      <p className="text-xs text-white/40 mt-4">
        * Integração de pagamento: ligar os botões ao Stripe Checkout via
        endpoint <code className="px-1 rounded bg-white/5">/api/checkout</code>.
      </p>
    </section>
  );
}
