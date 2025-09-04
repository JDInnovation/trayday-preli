// src/lib/trades.ts
"use client";

import { db } from "@/lib/firebase.client";
import { doc, collection, runTransaction } from "firebase/firestore";
import type { Trade, UserDoc } from "@/lib/types";

/**
 * Apaga uma trade e, se estiver fechada, desfaz o efeito do PnL no currentBalance.
 */
export async function deleteTrade(uid: string, tradeId: string) {
  const userRef = doc(db, "users", uid);
  const tradeRef = doc(collection(db, "users", uid, "trades"), tradeId);

  await runTransaction(db, async (tx) => {
    const [uSnap, tSnap] = await Promise.all([tx.get(userRef), tx.get(tradeRef)]);
    if (!tSnap.exists()) return;

    const u = (uSnap.data() || {}) as UserDoc;
    const t = tSnap.data() as Trade;

    // Se estava fechada, remove o PnL ao saldo atual
    if (t.status === "closed" && typeof t.pnl === "number") {
      const next = (u.currentBalance || 0) - (t.pnl || 0);
      tx.update(userRef, { currentBalance: next });
    }

    tx.delete(tradeRef);
  });
}
