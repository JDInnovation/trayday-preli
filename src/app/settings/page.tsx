// app/settings/page.tsx
"use client";

import React from "react";
import HeaderBar from "@/components/HeaderBar";
import { auth, db } from "@/lib/firebase.client";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  Save,
  SlidersHorizontal,
  Shield,
  Eye,
  EyeOff,
  Target,
  TrendingDown,
} from "lucide-react";

type Leverage = { short: number; normal: number; long: number };

export default function SettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [currency, setCurrency] = React.useState("EUR");
  const [hideBalance, setHideBalance] = React.useState(true);

  const [defaultRiskPct, setDefaultRiskPct] = React.useState(1.5);
  const [maxLossPct, setMaxLossPct] = React.useState(2);
  const [lev, setLev] = React.useState<Leverage>({
    short: 1.8,
    normal: 3,
    long: 6,
  });

  // NOVO: metas/limites diários
  const [dayLossPct, setDayLossPct] = React.useState(9);
  const [dayGoalPct, setDayGoalPct] = React.useState(15);

  const uid = auth.currentUser?.uid || null;

  React.useEffect(() => {
    let cancel = false;
    async function load() {
      if (!uid) {
        setLoading(false);
        setError("Precisas de iniciar sessão.");
        return;
      }
      try {
        const ref = doc(db, "users", uid);
        const snap = await getDoc(ref);
        const data = snap.data() || {};

        if (data.currency) setCurrency(String(data.currency));
        if (data.preferences?.hideBalance !== undefined) {
          setHideBalance(Boolean(data.preferences.hideBalance));
        }
        if (data.params?.defaultRiskPct !== undefined) {
          setDefaultRiskPct(Number(data.params.defaultRiskPct));
        }
        if (data.params?.maxLossPct !== undefined) {
          setMaxLossPct(Number(data.params.maxLossPct));
        }
        if (data.params?.leverage) {
          setLev({
            short: Number(data.params.leverage.short ?? 1.8),
            normal: Number(data.params.leverage.normal ?? 3),
            long: Number(data.params.leverage.long ?? 6),
          });
        }
        // NOVO: metas/limites diários
        if (data.params?.dayLossPct !== undefined) {
          setDayLossPct(Number(data.params.dayLossPct));
        }
        if (data.params?.dayGoalPct !== undefined) {
          setDayGoalPct(Number(data.params.dayGoalPct));
        }

        if (!cancel) setLoading(false);
      } catch {
        if (!cancel) {
          setError("Falha a carregar definições.");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancel = true;
    };
  }, [uid]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!uid) return;
    setSaving(true);
    setError(null);
    try {
      const ref = doc(db, "users", uid);
      await updateDoc(ref, {
        currency,
        "preferences.hideBalance": hideBalance,
        "params.defaultRiskPct": Number(defaultRiskPct),
        "params.maxLossPct": Number(maxLossPct),
        "params.leverage.short": Number(lev.short),
        "params.leverage.normal": Number(lev.normal),
        "params.leverage.long": Number(lev.long),
        // NOVO: metas/limites diários
        "params.dayLossPct": Number(dayLossPct),
        "params.dayGoalPct": Number(dayGoalPct),
      });
    } catch {
      setError("Não foi possível guardar. Tenta novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <HeaderBar />
      <main className="max-w-5xl mx-auto p-4 md:p-6 pt-16 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Definições</h1>
            <p className="opacity-70 text-sm">
              Personaliza a experiência e os parâmetros de risco.
            </p>
          </div>
          <div className="hidden md:block opacity-70 text-sm">
            Conta: {auth.currentUser?.email ?? "—"}
          </div>
        </header>

        {loading && <div className="opacity-80">A carregar definições…</div>}
        {!loading && error && (
          <div className="rounded-lg bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/20 p-3 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <form onSubmit={save} className="space-y-6">
            {/* Privacidade & Conta */}
            <section className="card space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 opacity-70" />
                <h2 className="font-semibold">Privacidade & Conta</h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Moeda */}
                <div className="space-y-2">
                  <label className="text-xs opacity-70">Moeda base</label>
                  <select
                    className="w-full rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="EUR">EUR — Euro</option>
                    <option value="USD">USD — Dólar</option>
                    <option value="GBP">GBP — Libra</option>
                    <option value="BRL">BRL — Real</option>
                  </select>
                </div>

                {/* Ocultar saldo */}
                <div className="space-y-2">
                  <label className="text-xs opacity-70">Visibilidade do saldo</label>
                  <button
                    type="button"
                    onClick={() => setHideBalance((v) => !v)}
                    className="w-full inline-flex items-center justify-between rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm hover:bg-white/10"
                    aria-pressed={hideBalance}
                    title={hideBalance ? "Mostrar saldo" : "Ocultar saldo"}
                  >
                    <span>
                      {hideBalance ? "Oculto por defeito" : "Visível por defeito"}
                    </span>
                    {hideBalance ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* Parâmetros de Trading */}
            <section className="card space-y-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 opacity-70" />
                <h2 className="font-semibold">Parâmetros de Trading</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Risco por defeito */}
                <div className="space-y-2">
                  <label className="text-xs opacity-70">
                    Risco por trade (por defeito)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      className="flex-1 rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                      value={defaultRiskPct}
                      onChange={(e) => setDefaultRiskPct(Number(e.target.value))}
                    />
                    <span className="inline-flex items-center px-3 rounded-lg bg-white/5 ring-1 ring-white/10 text-sm">
                      %
                    </span>
                  </div>
                  <p className="text-xs opacity-60">
                    Usado como sugestão no Order Form (ex.: 1.5%).
                  </p>
                </div>

                {/* Perda máxima por trade */}
                <div className="space-y-2">
                  <label className="text-xs opacity-70">Perda máxima por trade</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      className="flex-1 rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                      value={maxLossPct}
                      onChange={(e) => setMaxLossPct(Number(e.target.value))}
                    />
                    <span className="inline-flex items-center px-3 rounded-lg bg-white/5 ring-1 ring-white/10 text-sm">
                      %
                    </span>
                  </div>
                  <p className="text-xs opacity-60">
                    Informativo para o teu Stop Loss (ex.: 2%).
                  </p>
                </div>
              </div>

              {/* Alavancagens */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs opacity-70">Curta (×)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    className="w-full rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                    value={lev.short}
                    onChange={(e) =>
                      setLev({ ...lev, short: Number(e.target.value) })
                    }
                  />
                  <p className="text-xs opacity-60">Por defeito: 1.8</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs opacity-70">Normal (×)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    className="w-full rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                    value={lev.normal}
                    onChange={(e) =>
                      setLev({ ...lev, normal: Number(e.target.value) })
                    }
                  />
                  <p className="text-xs opacity-60">Por defeito: 3</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs opacity-70">Longa (×)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    className="w-full rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                    value={lev.long}
                    onChange={(e) =>
                      setLev({ ...lev, long: Number(e.target.value) })
                    }
                  />
                  <p className="text-xs opacity-60">Por defeito: 6</p>
                </div>
              </div>

              {/* NOVO: Metas & Limites Diários */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Perda diária (% do saldo) */}
                <div className="space-y-2">
                  <label className="text-xs opacity-70 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 opacity-70" />
                    Limite de perda diária (%)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      className="flex-1 rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                      value={dayLossPct}
                      onChange={(e) => setDayLossPct(Number(e.target.value))}
                    />
                    <span className="inline-flex items-center px-3 rounded-lg bg-white/5 ring-1 ring-white/10 text-sm">
                      %
                    </span>
                  </div>
                  <p className="text-xs opacity-60">
                    Percentagem do saldo usada no widget “Risco & Meta” (ex.: 9%).
                  </p>
                </div>

                {/* Meta diária (% do saldo) */}
                <div className="space-y-2">
                  <label className="text-xs opacity-70 flex items-center gap-2">
                    <Target className="w-4 h-4 opacity-70" />
                    Meta diária (%)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      className="flex-1 rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                      value={dayGoalPct}
                      onChange={(e) => setDayGoalPct(Number(e.target.value))}
                    />
                    <span className="inline-flex items-center px-3 rounded-lg bg-white/5 ring-1 ring-white/10 text-sm">
                      %
                    </span>
                  </div>
                  <p className="text-xs opacity-60">
                    Percentagem do saldo usada como “Meta diária” (ex.: 15%).
                  </p>
                </div>
              </div>
            </section>

            {/* Guardar */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 bg-white/10 hover:bg:white/15 ring-1 ring-white/10 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title="Guardar definições"
              >
                <Save className="w-4 h-4" />
                Guardar alterações
              </button>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
