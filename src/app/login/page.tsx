"use client";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase.client";
import {
  CheckCircle2,
  ShieldCheck,
  LineChart,
  Download,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Calendar,
  BarChart2,
} from "lucide-react";
import FeaturedCards from "@/components/FeaturedCards";

function mapAuthError(e: any): string {
  const code = (e?.code || "").toString();
  switch (code) {
    case "auth/invalid-email":
      return "Email inválido.";
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Credenciais inválidas.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Tenta de novo mais tarde.";
    case "auth/email-already-in-use":
      return "Este email já está registado.";
    case "auth/weak-password":
      return "Password fraca (mín. 6 caracteres).";
    case "auth/network-request-failed":
      return "Sem ligação de rede. Verifica a tua internet.";
    default:
      return e?.message || "Ocorreu um erro. Tenta novamente.";
  }
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [info, setInfo] = useState<string>("");
  const router = useRouter();

  const subtitle = useMemo(
    () =>
      mode === "login"
        ? "Bem-vindo de volta. Continua a tua evolução com análises em tempo real."
        : "Cria a tua conta em segundos. Onboarding simples: saldo inicial e moeda.",
    [mode]
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErr("");
      setInfo("");
      setLoading(true);
      try {
        if (mode === "login") {
          await signInWithEmailAndPassword(auth, email.trim(), pass);
        } else {
          if (pass !== pass2) throw new Error("As passwords não coincidem.");
          const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
          await setDoc(
            doc(db, "users", cred.user.uid),
            {
              email: cred.user.email,
              currency: "EUR",
              startingBalance: null,
              currentBalance: null,
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
        router.push("/dashboard");
      } catch (e: any) {
        setErr(mapAuthError(e));
      } finally {
        setLoading(false);
      }
    },
    [mode, email, pass, pass2, router]
  );

  const onReset = useCallback(async () => {
    setErr("");
    setInfo("");
    if (!email.trim()) {
      setErr("Introduz o teu email para recuperar a password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo("Enviámos um email de recuperação de password.");
    } catch (e: any) {
      setErr(mapAuthError(e));
    }
  }, [email]);

  return (
    <main className="min-h-screen flex items-stretch">
      {/* Coluna de apresentação */}
      <section className="hidden lg:flex flex-1 flex-col justify-between p-8">
        <header className="flex items-center gap-3">
          <span className="font-semibold tracking-tight">Traday.io</span>
        </header>

        <div>
          <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.1] mb-3">
            O teu cockpit de <span className="text-ok">performance</span> em trading.
          </h1>
          <p className="mt-6 text-lg text-sub max-w-2xl">
            KPIs accionáveis, calendário de sessões, gestão de risco e exportações
            num só lugar. Constrói consistência com métricas reais e controlo total.
          </p>

          {/* 👉 agora a secção usa o teu componente */}
          <FeaturedCards />

          <div className="mt-9 flex flex-wrap items-center gap-4 text-sm text-sub">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              Firebase Auth & Firestore
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Sem lock-in 
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Grátis para começar
            </span>
          </div>
        </div>

        <footer className="text-xs text-sub">
          © {new Date().getFullYear()} TradeWay • Next.js & Firebase
        </footer>
      </section>

      {/* Coluna do formulário */}
      <section className="flex-1 flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md">
          <div className="card">
            <div className="mb-3">
              <h2 className="text-2xl font-bold">
                {mode === "login" ? "Entrar" : "Criar conta"}
              </h2>
              <p className="small mt-1">{subtitle}</p>
            </div>

            <form className="flex flex-col gap-3" onSubmit={onSubmit}>
              <div>
                <label className="label">Email</label>
                <div className="flex items-center gap-2">
                  <IconBubble>
                    <Mail className="h-4 w-4" />
                  </IconBubble>
                  <input
                    className="input w-full"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="flex items-center gap-2">
                  <IconBubble>
                    <Lock className="h-4 w-4" />
                  </IconBubble>
                  <input
                    className="input w-full"
                    type={showPass ? "text" : "password"}
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    minLength={6}
                    required
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={showPass ? "Ocultar password" : "Mostrar password"}
                    onClick={() => setShowPass((s) => !s)}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === "signup" && (
                <div>
                  <label className="label">Confirmar password</label>
                  <input
                    className="input w-full"
                    type="password"
                    value={pass2}
                    onChange={(e) => setPass2(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                    placeholder="repete a password"
                  />
                  <p className="small mt-1">
                    Após registo, pedimos o <b>saldo inicial</b> e a <b>moeda</b>.
                  </p>
                </div>
              )}

              {(err || info) && (
                <div className={`${err ? "text-danger" : "text-ok"} text-sm`}>
                  {err || info}
                </div>
              )}

              <button className="btn btn-primary mt-1" disabled={loading}>
                {loading ? (
                  mode === "login" ? "A entrar…" : "A criar…"
                ) : (
                  <span className="inline-flex items-center gap-2">
                    {mode === "login" ? "Entrar" : "Criar conta"}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </button>
            </form>

            <div className="mt-3 flex items-center justify-between">
              <button type="button" onClick={onReset} className="btn-ghost">
                Esqueceste a password?
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setErr("");
                  setInfo("");
                  setMode((m) => (m === "login" ? "signup" : "login"));
                }}
              >
                {mode === "login" ? "Criar conta" : "Já tenho conta"}
              </button>
            </div>
          </div>

          {/* Mini badges em mobile */}
          <div className="mt-6 grid grid-cols-2 gap-3 lg:hidden">
            <MiniBadge icon={<BarChart2 className="h-4 w-4" />} text="KPIs em tempo real" />
            <MiniBadge icon={<Calendar className="h-4 w-4" />} text="Calendário de sessões" />
            <MiniBadge icon={<LineChart className="h-4 w-4" />} text="Controlo de risco" />
            <MiniBadge icon={<Download className="h-4 w-4" />} text="Exportações & payout" />
          </div>
        </div>
      </section>
    </main>
  );
}

/* ---------- helpers locais ---------- */

function IconBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="icon-btn shrink-0 h-8 w-8 rounded-xl flex items-center justify-center">
      {children}
    </div>
  );
}

function MiniBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="badge w-full justify-center">
      {icon}
      <span>{text}</span>
    </div>
  );
}
