"use client";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase.client";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email.trim(), pass);
      } else {
        if (pass !== pass2) throw new Error("As passwords não coincidem.");
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);

        // cria/atualiza o documento do utilizador (mínimo necessário)
        await setDoc(
          doc(db, "users", cred.user.uid),
          {
            email: cred.user.email,
            currency: "EUR",            // default; pode mudar no onboarding
            startingBalance: null,      // será pedido no onboarding
            currentBalance: null,       // idem
            createdAt: serverTimestamp()
          },
          { merge: true }
        );
      }
      router.push("/dashboard");
    } catch (e: any) {
      setErr(e?.message || "Ocorreu um erro. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto card">
      <h2 className="text-xl font-bold mb-2">
        {mode === "login" ? "Entrar" : "Criar conta"}
      </h2>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={6}
            required
          />
        </div>

        {mode === "signup" && (
          <div>
            <label className="label">Confirmar password</label>
            <input
              className="input"
              type="password"
              value={pass2}
              onChange={(e) => setPass2(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
            <p className="small mt-1">
              Depois do registo pedimos o <b>saldo inicial</b> e moeda no onboarding.
            </p>
          </div>
        )}

        {err && <div className="text-danger text-sm">{err}</div>}

        <button className="btn mt-2" disabled={loading}>
          {loading ? (mode === "login" ? "A entrar..." : "A criar…") : (mode === "login" ? "Entrar" : "Criar conta")}
        </button>
      </form>

      <div className="flex items-center justify-between mt-3">
        <span className="small">
          {mode === "login" ? "Ainda não tens conta?" : "Já tens conta?"}
        </span>
        <button
          className="btn-ghost"
          onClick={() => {
            setErr("");
            setMode(mode === "login" ? "signup" : "login");
          }}
        >
          {mode === "login" ? "Criar conta" : "Entrar"}
        </button>
      </div>
    </div>
  );
}
