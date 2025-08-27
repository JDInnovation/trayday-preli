"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Ctx = {
  hideBalance: boolean;
  toggle: () => void;
};

const PrivacyCtx = createContext<Ctx | null>(null);

export default function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hideBalance, setHideBalance] = useState(true);

  // Persistência local (mantém a escolha entre sessões)
  useEffect(() => {
    const v = typeof window !== "undefined" ? localStorage.getItem("hideBalance") : null;
    if (v !== null) setHideBalance(v === "1");
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("hideBalance", hideBalance ? "1" : "0");
    }
  }, [hideBalance]);

  return (
    <PrivacyCtx.Provider value={{ hideBalance, toggle: () => setHideBalance((s) => !s) }}>
      {children}
    </PrivacyCtx.Provider>
  );
}

export function usePrivacy() {
  const ctx = useContext(PrivacyCtx);
  if (!ctx) throw new Error("usePrivacy must be used within <PrivacyProvider>");
  return ctx;
}
