"use client";

import { auth } from "@/lib/firebase.client";
import { useEffect, useRef, useState } from "react";
import { LogoutBtn } from "./AuthGate";
import { Settings } from "lucide-react";

export default function HeaderBar() {
  const [email, setEmail] = useState<string>("");
  const [clock, setClock] = useState("00:00:00");
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    setEmail(auth.currentUser?.email || "");
    startRef.current = Date.now();
    const t = setInterval(() => {
      const diff = Date.now() - startRef.current;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setClock(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const today = new Date().toLocaleDateString("pt-PT", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Olá, {email} 👋</h2>
          <div className="small">Hoje é {today}. Cada dia é uma sessão.</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost w-10 h-10 flex items-center justify-center rounded-xl" title="Definições (em breve)">
            <Settings className="w-5 h-5" />
          </button>
          <div className="small">Tempo da Sessão: <span className="tabular-nums">{clock}</span></div>
          <LogoutBtn />
        </div>
      </div>
    </div>
  );
}
