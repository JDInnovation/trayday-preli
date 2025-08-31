export type TradeSide = "LONG" | "SHORT";
export type TradeStatus = "open" | "closed";
export type TradeTypeKey = "curta" | "normal" | "longa";

export interface Trade {
  id: string;
  symbol: string;
  ticker?: string;
  side: TradeSide;
  riskPct: number;
  riskAmount: number;
  fees: number;
  sizeUsd: number;
  tType: TradeTypeKey;
  note?: string;
  openAt: number;            // ms
  status: TradeStatus;
  closedAt?: number | null;  // ms
  pnl?: number | null;       // net (after fees)
  r?: number | null;
  balanceBefore: number;
  recommended: number;
  oversized: boolean;
}

export interface Cashflow {
  id: string;
  amount: number; // +depósito, -levantamento
  note?: string;
  ts: number;     // ms
}

export interface UserDoc {
  email: string;
  currency: "EUR" | "USD" | "BRL" | string;
  startingBalance: number | null;
  currentBalance: number | null;
  monthlyExpenses?: Record<string, number>; // "YYYY-MM" -> number
  createdAt: number;
}

export interface MonthAggDay {
  key: string; // YYYY-MM-DD
  date: Date;
  pnl: number;
  trades: number;
  hasTrades: boolean;
  dd: number;
  pctCumul: number;
  isToday: boolean;
  openEq: number;
  closeEq: number;
  highEq: number;
  lowEq: number;
}

