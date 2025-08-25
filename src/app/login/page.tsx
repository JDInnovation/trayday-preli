"use client";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase.client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      router.push("/dashboard");
    } catch (e: any) {
      setErr(e?.message || "Falha ao iniciar sessão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto card">
      <h2 className="text-xl font-bold mb-2">Entrar</h2>
      <form onSubmit={submit} className="flex flex-col gap-2">
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
            autoComplete="current-password"
            required
          />
        </div>
        {err && <div className="text-danger text-sm">{err}</div>}
        <button className="btn mt-2" disabled={loading}>
          {loading ? "A entrar..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
