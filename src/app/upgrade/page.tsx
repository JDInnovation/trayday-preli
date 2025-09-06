export const metadata = {
  title: "Upgrade Plan • Tradeway",
};

import HeaderBar from "@/components/HeaderBar";
import PricingPlans from "@/components/PricingPlans";
import PricingExtras from "@/components/PricingExtras";

export default function UpgradePage() {
  return (
    <>
      {/* Header fixo, consistente com o resto da app */}
      <HeaderBar />

      {/* Conteúdo da página com padding-top para não ficar escondido pelo header */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 pt-20 md:pt-6 pb-10">
        <header className="mb-6 md:mb-10">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Escolhe o teu plano
          </h1>
          <p className="text-white/60 mt-1">
            Planos simples, transparentes e preparados para escalar contigo.
          </p>
        </header>

        {/* âncora para o CTA final apontar */}
        <div id="plans">
          <PricingPlans />
        </div>

        {/* Conteúdo adicional para conversão (prova social, ROI, comparação, FAQ, etc.) */}
        <PricingExtras />
      </main>
    </>
  );
}
