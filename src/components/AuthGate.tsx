// src/components/AuthGate.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth"; // ⬅️ adicionar
import { auth } from "@/lib/firebase.client";
import { useRouter, usePathname } from "next/navigation";

export default function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authed" | "anon">("loading");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const off = onAuthStateChanged(auth, (u) => setStatus(u ? "authed" : "anon"));
    return () => off();
  }, []);

  useEffect(() => {
    if (status === "anon" && pathname !== "/login") router.replace("/login");
  }, [status, pathname, router]);

  if (status !== "authed") return <div className="card">A iniciar sessão…</div>;
  return <>{children}</>;
}

export function LogoutBtn() {
  const router = useRouter();
  return (
    <button
      className="btn-ghost"
      onClick={async () => {
        await signOut(auth);
        router.push("/login");
      }}
    >
      Sair
    </button>
  );
}
