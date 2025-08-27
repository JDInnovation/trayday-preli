"use client";

import { usePrivacy } from "./PrivacyProvider";
import { Eye, EyeOff, Wallet } from "lucide-react";
import { fmtMoney } from "@/lib/utils";

export default function BalanceChip({
  balance,
  currency,
}: {
  balance: number;
  currency: string;
}) {
  const { hideBalance, toggle } = usePrivacy();

  const value = hideBalance
    ? "••••••"
    : fmtMoney(balance || 0, currency);

  return (
    <div className="rounded-xl border border-line bg-slate-900/40 px-3 py-2 flex items-center justify-center gap-2 md:gap-3 min-w-[200px] md:min-w-[240px]">
      <Wallet className="w-4 h-4 text-sub" />
      <div className="flex-1 text-center">
        <div className="text-sub text-[11px] md:text-xs leading-none">Saldo atual</div>
        <div className="font-semibold text-slate-200 text-sm md:text-base leading-tight">
          {value}
        </div>
      </div>
      <button
        className="btn-ghost p-1"
        onClick={toggle}
        aria-label={hideBalance ? "Mostrar saldo" : "Ocultar saldo"}
        title={hideBalance ? "Mostrar saldo" : "Ocultar saldo"}
      >
        {hideBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
    </div>
  );
}
