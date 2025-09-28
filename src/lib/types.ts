// src/lib/types.ts

export type Side = "long" | "short";
export type TradeStatus = "open" | "closed";

export interface Trade {
  id?: string;
  symbol?: string;
  ticker?: string;       // alias para compatibilidade com código que usa 'ticker'
  side?: Side;
  status?: TradeStatus;
  openAt?: number | null;
  closedAt?: number | null;

  // métricas de resultado
  pnl?: number | null;
  fees?: number | null;
  r?: number | null;

  // risco e tamanho
  riskPct?: number | null;
  riskAmount?: number | null;
  size?: number | null;      // tamanho na moeda da conta
  sizeUsd?: number | null;   // tamanho em USD, se aplicável

  // contexto/auxiliares
  tType?: string | null;     // tipo de trade (scalp/swing/etc), usado por typeFactor
  balanceBefore?: number | null; // ⬅️ ADICIONADO: saldo de referência antes da trade
  recommended?: boolean | null;
  oversized?: boolean | null;

  note?: string | null;
}

export interface Cashflow {
  id?: string;
  ts?: number | null;           // timestamp (recomendado)
  date?: number | null;         // alternativa legacy
  type?: string | null;         // "deposit" | "withdraw" | "expense" | ...
  kind?: string | null;         // alias de type (legacy)
  amount: number;               // positivo/negativo
  note?: string | null;
  description?: string | null;  // alias de note (legacy)
}

export interface TradingLeverage {
  short?: number;
  normal?: number;
  long?: number;
  // aliases PT para compat:
  curta?: number;
  longa?: number;
}

export interface TradingParams {
  /** risco por trade sugerido (%, ex.: 1.5) */
  defaultRiskPct?: number;
  /** perda máxima por trade (%, ex.: 2) */
  maxLossPct?: number;

  /** limites diários configuráveis (%, ex.: 9 e 15) */
  dayLossPct?: number;
  dayGoalPct?: number;

  /** multiplicadores de alavancagem para quick buttons */
  leverage?: TradingLeverage;
}

export interface UserPreferences {
  hideBalance?: boolean;
}

export interface UserProfile {
  displayName?: string;
  bio?: string;
  birthdate?: string;                // YYYY-MM-DD
  avatarKey?: "chart" | "target" | "bolt";
}

export interface UserDoc {
  uid?: string;
  email?: string;
  currency: string;

  startingBalance?: number;
  currentBalance?: number;

  preferences?: UserPreferences;
  params?: TradingParams;
  profile?: UserProfile;
}
