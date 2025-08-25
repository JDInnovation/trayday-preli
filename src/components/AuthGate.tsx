"use client";

import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureUserDoc } from "@/lib/firestore";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      await ensureUserDoc(u);
      setReady(true);
    });
    return () => unsub();
  }, [router]);

  if (!ready) return <div className="card">A carregar…</div>;
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
