// src/lib/firestore.ts
import { db } from "@/lib/firebase.client";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  runTransaction,
  deleteDoc,
  updateDoc,
  getDocs,
} from "firebase/firestore";
import {
  Cashflow,
  Trade,
  UserDoc,
  UserProfile,
  UserPreferences,
  RiskParams,
  TradeMultipliers,
} from "./types";
import { uid, monthKey, startOfMonth, endOfMonth } from "./utils";
import { User } from "firebase/auth";

/* ---------- Refs ---------- */
export const userDocRef = (uidStr: string) => doc(db, "users", uidStr);
export const tradesColRef = (uidStr: string) => collection(db, "users", uidStr, "trades");
export const cashflowsColRef = (uidStr: string) => collection(db, "users", uidStr, "cashflows");

/* ---------- Bootstrap user ---------- */
export async function ensureUserDoc(user: User) {
  const ref = userDocRef(user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const data: UserDoc = {
      email: user.email || "",
      currency: "EUR",
      // Usamos null para que o onboarding detecte 1.º login
      startingBalance: null as any,
      currentBalance: null as any,
      monthlyExpenses: {},
      createdAt: Date.now(),
    } as any;
    await setDoc(ref, data);
  }
}

/* ---------- Onboarding ---------- */
export async function saveOnboarding(uidStr: string, startingBalance: number, currency: string) {
  const ref = userDocRef(uidStr);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const _u = snap.data() as UserDoc;
    tx.update(ref, {
      startingBalance,
      currentBalance: startingBalance,
      currency,
    });
  });
}

/* ---------- Trades ---------- */
export async function openTrade(uidStr: string, t: Omit<Trade, "id">) {
  const newId = uid();
  await setDoc(doc(tradesColRef(uidStr), newId), { ...t, id: newId });
}

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
      const newNet = next.pnl ?? 0;
      delta = newNet - oldPnL;
    } else if (!wasClosed && willClosed) {
      const newNet = next.pnl ?? 0;
      delta = newNet;
    } else if (wasClosed && !willClosed) {
      delta = -(prev.pnl || 0);
      (next as any).pnl = null;
      (next as any).closedAt = null;
    }

    tx.set(tRef, next as Partial<Trade>, { merge: true });
    tx.update(uRef, { currentBalance: (u.currentBalance || 0) + delta });
  });
}

/* ---------- Cashflows ---------- */
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

/* ---------- Expenses ---------- */
export async function addMonthExpense(uidStr: string, y: number, m: number, delta: number) {
  const key = monthKey(y, m);
  const uRef = userDocRef(uidStr);
  await runTransaction(db, async (tx) => {
    const uSnap = await tx.get(uRef);
    const u = uSnap.data() as UserDoc;
    const cur =
      u.monthlyExpenses && typeof (u.monthlyExpenses as any)[key] === "number"
        ? (u.monthlyExpenses as any)[key]
        : 0;
    const next = Math.max(0, cur + delta);
    const newMap = { ...(u.monthlyExpenses || {}), [key]: next };
    tx.update(uRef, { monthlyExpenses: newMap });
  });
}

/* ---------- Streams ---------- */
export function listenUser(uidStr: string, cb: (u: UserDoc) => void) {
  return onSnapshot(userDocRef(uidStr), (snap) => cb(snap.data() as UserDoc));
}

export function listenTradesMonth(uidStr: string, y: number, m: number, cb: (arr: Trade[]) => void) {
  const s = startOfMonth(y, m).getTime();
  const qy = query(
    tradesColRef(uidStr),
    where("openAt", ">=", s),
    where("openAt", "<=", endOfMonth(y, m).getTime()),
    orderBy("openAt", "desc")
  );
  return onSnapshot(qy, (snap) => cb(snap.docs.map((d) => d.data() as Trade)));
}

export function listenAllTrades(uidStr: string, cb: (arr: Trade[]) => void) {
  const qy = query(tradesColRef(uidStr), orderBy("openAt", "desc"));
  return onSnapshot(qy, (snap) => cb(snap.docs.map((d) => d.data() as Trade)));
}

export function listenCashflows(uidStr: string, cb: (arr: Cashflow[]) => void) {
  const qy = query(cashflowsColRef(uidStr), orderBy("ts", "desc"));
  return onSnapshot(qy, (snap) => cb(snap.docs.map((d) => d.data() as Cashflow)));
}

/* ---------- SETTINGS HELPERS ---------- */
export async function updateUserProfile(uid: string, data: UserProfile) {
  const ref = userDocRef(uid);
  await setDoc(ref, { profile: data }, { merge: true });
}

export async function updateUserPreferences(uid: string, prefs: UserPreferences) {
  const ref = userDocRef(uid);
  await setDoc(ref, { preferences: prefs, currency: prefs.currency }, { merge: true });
}

export async function updateRiskParams(uid: string, risk: RiskParams) {
  const ref = userDocRef(uid);
  await setDoc(ref, { risk }, { merge: true });
}

export async function updateMultipliers(uid: string, multipliers: TradeMultipliers) {
  const ref = userDocRef(uid);
  await setDoc(ref, { multipliers }, { merge: true });
}

/** Apaga TODAS as trades e movimentos do utilizador */
export async function clearAccountData(uid: string) {
  const tradesRef = tradesColRef(uid);
  const cashRef = cashflowsColRef(uid);
  const [tSnap, cSnap] = await Promise.all([getDocs(tradesRef), getDocs(cashRef)]);
  const dels: Promise<any>[] = [];
  tSnap.forEach((d) => dels.push(deleteDoc(d.ref)));
  cSnap.forEach((d) => dels.push(deleteDoc(d.ref)));
  await Promise.all(dels);
}

/** Repõe saldo/moeda e “zera” equity atual */
export async function resetTradingAccount(uid: string, startingBalance: number, currency: string) {
  const ref = userDocRef(uid);
  await updateDoc(ref, {
    startingBalance,
    currentBalance: startingBalance,
    currency,
    preferences: { currency, maskBalance: false },
    resetAt: Date.now(),
  } as any);
}
