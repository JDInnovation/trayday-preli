// src/lib/types.ts

// ---- Trades ----
export type TradeStatus = "open" | "closed";
export type TradeSide = "long" | "short" | "buy" | "sell";

export interface Trade {
  id: string;
  symbol: string;

  side?: TradeSide;

  // sizing / risco
  riskAmount: number;             // valor em moeda base
  multiplierType?: "short" | "normal" | "long"; // tipo escolhido (curta/normal/longa)
  orderUsd?: number;              // tamanho da ordem em USD (aconselhado)
  fees?: number;
  tax?: number;

  // ciclo de vida
  status: TradeStatus;
  openAt: number;                 // epoch ms
  closedAt?: number | null;       // epoch ms
  pnl?: number | null;            // net (já depois de fees) quando fechada
  r?: number;                     // pnl / riskAmount
  notes?: string;

  // extra (opcional)
  leverage?: number;
  rate?: number;                  // “taxa” se usares
}

// ---- Cashflows ----
export interface Cashflow {
  id: string;
  amount: number;                 // positivo = depósito, negativo = levantamento
  note?: string;
  ts: number;                     // epoch ms
  type?: "deposit" | "withdraw";  // opcional (nem sempre usado)
}

// ---- Utilizador (documento principal) ----
export interface UserDoc {
  email: string;
  currency: string;
  startingBalance: number | null;
  currentBalance: number | null;
  monthlyExpenses?: Record<string, number>; // "YYYY-MM" -> total despesas
  createdAt: number;                         // epoch ms

  // definições opcionais
  profile?: UserProfile;
  preferences?: UserPreferences;
  risk?: RiskParams;
  multipliers?: TradeMultipliers;
}

// ---- Definições / Perfil ----
export interface UserProfile {
  displayName?: string;
  birthDate?: string;             // "YYYY-MM-DD"
  bio?: string;
  avatarKey?: "bull" | "rocket" | "chart"; // 3 opções simples
  photoURL?: string | null;
}

export interface UserPreferences {
  concealBalance?: boolean;       // esconder saldo por omissão
  theme?: "auto" | "light" | "dark";
  locale?: string;
  timeZone?: string;
}

export interface RiskParams {
  maxPerTradePct?: number;        // ex: 3
  maxPerDayPct?: number;          // ex: 9
  dailyTargetPct?: number;        // ex: 15
}

export interface TradeMultipliers {
  short: number;                   // ex: 6
  normal: number;                  // ex: 3
  long: number;                    // ex: 1.8
}
