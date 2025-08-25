"use client";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/lib/firebase.client";
import { ensureUserDoc } from "@/lib/firestore";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [err, setErr] = useState<string>("");
  const router = useRouter();

  const onSubmit = async () => {
    setErr("");
    try {
      if (mode === "signin") {
        const { user } = await signInWithEmailAndPassword(auth, email, pass);
        await ensureUserDoc(user);
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email, pass);
        await ensureUserDoc(user);
      }
      router.push("/dashboard");
    } catch (e: any) {
      setErr(e.message || "Erro");
    }
  };

  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-xl font-bold mb-2">{mode === "signin" ? "Entrar" : "Criar conta"}</h1>
      <p className="small mb-3">Demo: e-mail + password. Cada utilizador tem a sua conta.</p>
      <label className="label">Email</label>
      <input className="input mb-3" type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <label className="label">Password</label>
      <input className="input mb-4" type="password" value={pass} onChange={e => setPass(e.target.value)} />
      {err && <div className="text-danger text-sm mb-3">{err}</div>}
      <div className="flex gap-2 justify-end">
        <button className="btn-ghost" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "Criar conta" : "Já tenho conta"}
        </button>
        <button className="btn" onClick={onSubmit}>{mode === "signin" ? "Entrar" : "Registar"}</button>
      </div>
    </div>
  );
}
