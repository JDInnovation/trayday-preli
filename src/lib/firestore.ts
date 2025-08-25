"use client";

import { db } from "./firebase";
import {
  collection, doc, setDoc, getDoc, addDoc, onSnapshot, query, where, orderBy, runTransaction, deleteDoc
} from "firebase/firestore";
import { Cashflow, Trade, UserDoc } from "./types";
import { uid, monthKey, startOfMonth, endOfMonth, typeFactor } from "./utils";
import { User } from "firebase/auth";

export const userDocRef = (uidStr: string) => doc(db, "users", uidStr);
export const tradesColRef = (uidStr: string) => collection(db, "users", uidStr, "trades");
export const cashflowsColRef = (uidStr: string) => collection(db, "users", uidStr, "cashflows");

// Create user doc on first login
export async function ensureUserDoc(user: User) {
  const ref = userDocRef(user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const data: UserDoc = {
      email: user.email || "",
      currency: "EUR",
      startingBalance: null,
      currentBalance: null,
      monthlyExpenses: {},
      createdAt: Date.now()
    };
    await setDoc(ref, data);
  }
}

// Save onboarding
export async function saveOnboarding(uidStr: string, startingBalance: number, currency: string) {
  const ref = userDocRef(uidStr);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const u = snap.data() as UserDoc;
    tx.update(ref, {
      startingBalance: startingBalance,
      currentBalance: startingBalance,
      currency: currency
    });
  });
}

// Open trade
export async function openTrade(uidStr: string, t: Omit<Trade, "id">) {
  const newId = uid();
  await setDoc(doc(tradesColRef(uidStr), newId), { ...t, id: newId });
}

// Close trade (transaction to also update balance)
export async function closeTrade(uidStr: string, tradeId: string, pnlInput: number) {
  const uRef = userDocRef(uidStr);
  const tRef = doc(tradesColRef(uidStr), tradeId);

  await runTransaction(db, async (tx) => {
    const uSnap = await tx.get(uRef);
    const tSnap = await tx.get(tRef);
    if (!tSnap.exists()) throw new Error("Trade inexistente");
    const u = uSnap.data() as UserDoc;
    const t = tSnap.data() as Trade;

    if (t.status === "closed") return;

    const pnlNet = pnlInput - (t.fees || 0);
    const r = t.riskAmount > 0 ? pnlNet / t.riskAmount : 0;

    tx.update(tRef, { pnl: pnlNet, r, status: "closed", closedAt: Date.now() });
    tx.update(uRef, { currentBalance: (u.currentBalance || 0) + pnlNet });
  });
}

// Edit trade (handles balance diff if status/pnl changes)
export async function editTrade(uidStr: string, next: Trade) {
  const uRef = userDocRef(uidStr);
  const tRef = doc(tradesColRef(uidStr), next.id);

  await runTransaction(db, async (tx) => {
    const uSnap = await tx.get(uRef);
    const tSnap = await tx.get(tRef);
    const u = uSnap.data() as UserDoc;
    const prev = tSnap.data() as Trade;

    let delta = 0;
    const wasClosed = prev.status === "closed";
    const willClosed = next.status === "closed";

    if (wasClosed && willClosed) {
      const oldPnL = prev.pnl || 0;
      const newNet = (next.pnl ?? 0);
      delta = newNet - oldPnL;
    } else if (!wasClosed && willClosed) {
      const newNet = (next.pnl ?? 0);
      delta = newNet;
    } else if (wasClosed && !willClosed) {
      delta = -(prev.pnl || 0);
      next.pnl = null;
      next.closedAt = null;
    }

    const patch: Partial<Trade> = next; // garante que é um "patch"
tx.set(tRef, patch as any, { merge: true });

    tx.update(uRef, { currentBalance: (u.currentBalance || 0) + delta });
  });
}

// Cashflow add/delete with balance updates
export async function addCashflow(uidStr: string, amount: number, note?: string) {
  const uRef = userDocRef(uidStr);
  const cfRef = cashflowsColRef(uidStr);

  await runTransaction(db, async (tx) => {
    const uSnap = await tx.get(uRef);
    const u = uSnap.data() as UserDoc;
    const next = (u.currentBalance || 0) + amount;
    if (next < 0) throw new Error("Saldo insuficiente para levantamento.");

    const cf: Cashflow = { id: uid(), amount, note: (note || "").trim(), ts: Date.now() };
    tx.set(doc(cfRef, cf.id), cf);
    tx.update(uRef, { currentBalance: next });
  });
}

export async function deleteCashflow(uidStr: string, cfId: string) {
  const uRef = userDocRef(uidStr);
  const cRef = doc(cashflowsColRef(uidStr), cfId);

  await runTransaction(db, async (tx) => {
    const uSnap = await tx.get(uRef);
    const cSnap = await tx.get(cRef);
    if (!cSnap.exists()) return;
    const u = uSnap.data() as UserDoc;
    const cf = cSnap.data() as Cashflow;

    const next = (u.currentBalance || 0) - (cf.amount || 0);
    if (next < 0) throw new Error("Não é possível remover: saldo ficaria negativo.");

    tx.delete(cRef);
    tx.update(uRef, { currentBalance: next });
  });
}

// Expenses
export async function addMonthExpense(uidStr: string, y: number, m: number, delta: number) {
  const key = monthKey(y, m);
  const uRef = userDocRef(uidStr);
  await runTransaction(db, async (tx) => {
    const uSnap = await tx.get(uRef);
    const u = uSnap.data() as UserDoc;
    const cur = (u.monthlyExpenses && typeof u.monthlyExpenses[key] === "number") ? (u.monthlyExpenses as any)[key] : 0;
    const next = Math.max(0, cur + delta);
    const newMap = { ...(u.monthlyExpenses || {}), [key]: next };
    tx.update(uRef, { monthlyExpenses: newMap });
  });
}

// Streams (listeners)
export function listenUser(uidStr: string, cb: (u: UserDoc) => void) {
  return onSnapshot(userDocRef(uidStr), (snap) => cb(snap.data() as UserDoc));
}

export function listenTradesMonth(uidStr: string, y: number, m: number, cb: (arr: Trade[]) => void) {
  const s = startOfMonth(y, m).getTime();
  const e = endOfMonth(y, m).getTime();
  // brings both open (opened this month) and closed (closed this month)
  const q = query(
    tradesColRef(uidStr),
    where("openAt", ">=", s),
    where("openAt", "<=", endOfMonth(y, m).getTime()),
    orderBy("openAt", "desc")
  );
  // We’ll also include closed filtered separately if needed in UI.
  return onSnapshot(q, (snap) => cb(snap.docs.map(d => d.data() as Trade)));
}

export function listenAllTrades(uidStr: string, cb: (arr: Trade[]) => void) {
  const q = query(tradesColRef(uidStr), orderBy("openAt", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map(d => d.data() as Trade)));
}

export function listenCashflows(uidStr: string, cb: (arr: Cashflow[]) => void) {
  const q = query(cashflowsColRef(uidStr), orderBy("ts", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map(d => d.data() as Cashflow)));
}
