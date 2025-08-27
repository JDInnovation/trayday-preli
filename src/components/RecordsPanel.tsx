"use client";

import { useState } from "react";
import OrderForm from "@/components/OrderForm";
import CashflowsCard from "@/components/CashflowsCard";
import type { Cashflow } from "@/lib/types";

export default function RecordsPanel({
  balance,
  currency,
  cashflows,
}: {
  balance: number;
  currency: string;
  cashflows: Cashflow[];
}) {
  const [tab, setTab] = useState<"order" | "cash">("order");

  return (
    <div className="flex flex-col gap-3">
      {/* Tabs apenas em mobile/smaller screens */}
      <div className="md:hidden card p-2">
        <div role="tablist" className="grid grid-cols-2 gap-2">
          <button
            role="tab"
            aria-selected={tab === "order"}
            className={`btn w-full ${tab === "order" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("order")}
          >
            Abrir trade
          </button>
          <button
            role="tab"
            aria-selected={tab === "cash"}
            className={`btn w-full ${tab === "cash" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("cash")}
          >
            Movimentos
          </button>
        </div>
      </div>

      {/* Mobile: painel único consoante a tab; Desktop: ambos lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        {/* Mobile: esconde/mostra; Desktop: força display dos dois */}
        <div className={`min-w-0 ${tab === "order" ? "" : "hidden md:block"}`}>
          <div className="h-full">
            <OrderForm balance={balance} currency={currency} />
          </div>
        </div>
        <div className={`min-w-0 ${tab === "cash" ? "" : "hidden md:block"}`}>
          <div className="h-full">
            <CashflowsCard cashflows={cashflows} currency={currency} />
          </div>
        </div>
      </div>
    </div>
  );
}
