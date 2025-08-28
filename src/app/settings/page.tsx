"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase.client";
import AuthGate from "@/components/AuthGate";
import HeaderBar from "@/components/HeaderBar";
import {
  listenUser,
  updateUserProfile,
  updateUserPreferences,
  updateRiskParams,
  updateMultipliers,
  resetTradingAccount,
  clearAccountData,
} from "@/lib/firestore";
import { UserDoc, TradeMultipliers, RiskParams, UserPreferences, UserProfile } from "@/lib/types";
import { Save, AlertTriangle, Shield, SlidersHorizontal, User, Wrench, RefreshCcw } from "lucide-react";

const AVATARS: Array<{ key: UserProfile["avatarKey"]; label: string; emoji: string }> = [
  { key: "chart", label: "Chart", emoji: "📈" },
  { key: "bolt", label: "Bolt", emoji: "⚡" },
  { key: "target", label: "Target", emoji: "🎯" },
];

export default function SettingsPage() {
  return (
    <AuthGate>
      <SettingsInner />
    </AuthGate>
  );
}

function SettingsInner() {
  const [uid, setUid] = useState<string | null>(null);
  const [user, setUser] = useState<UserDoc | null>(null);

  useEffect(() => {
    const off = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => off();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const off = listenUser(uid, setUser);
    return () => off();
  }, [uid]);

  if (!uid) return <div className="container-padded">A iniciar…</div>;
  if (!user) return <div className="container-padded">A carregar…</div>;

  return (
    <div className="container-padded">
      <HeaderBar />
      <h2 className="mt-4 mb-2 font-semibold text-xl">Definições</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <ProfileCard uid={uid} user={user} />
        <PreferencesCard uid={uid} user={user} />
        <RiskCard uid={uid} user={user} />
        <MultipliersCard uid={uid} user={user} />
        <DangerZone uid={uid} user={user} />
      </div>
    </div>
  );
}

/* =====================================================
   PROFILE
   ===================================================== */

function ProfileCard({ uid, user }: { uid: string; user: UserDoc }) {
  const [form, setForm] = useState<UserProfile>({
    displayName: user.profile?.displayName || "",
    birthDate: user.profile?.birthDate || "",
    bio: user.profile?.bio || "",
    avatarKey: user.profile?.avatarKey || "chart",
  });
  const [saving, setSaving] = useState(false);
  const initials = useMemo(() => {
    const email = user.email || "";
    const base =
      form.displayName?.trim().length
        ? form.displayName
        : email.split("@")[0]?.replace(/[._-]+/g, " ") || "T";
    return base
      .split(" ")
      .map((p) => p.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  }, [form.displayName, user.email]);

  const save = async () => {
    setSaving(true);
    try {
      await updateUserProfile(uid, form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <div className="icon-btn"><User className="h-4 w-4" /></div>
        <h3 className="font-semibold">Perfil</h3>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Nome visível</label>
          <input
            className="input w-full"
            value={form.displayName || ""}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            placeholder="Ex.: João Silva"
          />
        </div>
        <div>
          <label className="label">Data de nascimento</label>
          <input
            type="date"
            className="input w-full"
            value={form.birthDate || ""}
            onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Descrição (bio)</label>
          <input
            className="input w-full"
            value={form.bio || ""}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            placeholder="Curto e direto."
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Avatar</label>
          <div className="flex items-center gap-2">
            {AVATARS.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => setForm((f) => ({ ...f, avatarKey: a.key }))}
                className={`px-3 py-2 rounded-lg border ${form.avatarKey === a.key ? "btn-primary" : "btn-ghost"}`}
              >
                <span className="mr-1">{a.emoji}</span>
                {a.label}
              </button>
            ))}
            <div className="ml-auto small text-sub">Iniciais: <b>{initials}</b></div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-3">
        <button className="btn" onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          Guardar
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   PREFERENCES
   ===================================================== */

function PreferencesCard({ uid, user }: { uid: string; user: UserDoc }) {
  const [form, setForm] = useState<UserPreferences>({
    currency: user.preferences?.currency || user.currency || "EUR",
    maskBalance: user.preferences?.maskBalance ?? false,
    theme: user.preferences?.theme || "system",
    timezone:
      user.preferences?.timezone ||
      (typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "Europe/Lisbon"),
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateUserPreferences(uid, form);
      // sync preferências que ajudam o UI local
      if (typeof window !== "undefined") {
        localStorage.setItem("maskBalance", String(form.maskBalance));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <div className="icon-btn"><Wrench className="h-4 w-4" /></div>
        <h3 className="font-semibold">Preferências</h3>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Moeda</label>
          <select
            className="select w-full"
            value={form.currency}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
          >
            <option>EUR</option>
            <option>USD</option>
            <option>BRL</option>
            <option>GBP</option>
          </select>
        </div>
        <div>
          <label className="label">Tema</label>
          <select
            className="select w-full"
            value={form.theme}
            onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value as UserPreferences["theme"] }))}
          >
            <option value="system">Sistema</option>
            <option value="dark">Escuro</option>
            <option value="light">Claro</option>
          </select>
        </div>
        <div>
          <label className="label">Fuso horário</label>
          <input
            className="input w-full"
            value={form.timezone || ""}
            onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
            placeholder="Europe/Lisbon"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="maskBalance"
            type="checkbox"
            className="checkbox"
            checked={form.maskBalance}
            onChange={(e) => setForm((f) => ({ ...f, maskBalance: e.target.checked }))}
          />
          <label htmlFor="maskBalance" className="label m-0">Esconder saldo por defeito</label>
        </div>
      </div>

      <div className="flex justify-end mt-3">
        <button className="btn" onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          Guardar
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   RISK & GOALS
   ===================================================== */

function RiskCard({ uid, user }: { uid: string; user: UserDoc }) {
  const [form, setForm] = useState<RiskParams>({
    goalDayPct: user.risk?.goalDayPct ?? 15,
    maxLossTradePct: user.risk?.maxLossTradePct ?? 3,
    maxLossDayPct: user.risk?.maxLossDayPct ?? 9,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateRiskParams(uid, form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <div className="icon-btn"><Shield className="h-4 w-4" /></div>
        <h3 className="font-semibold">Risco & metas</h3>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <NumberInput
          label="Meta diária (%)"
          value={form.goalDayPct}
          onChange={(v) => setForm((f) => ({ ...f, goalDayPct: v }))}
        />
        <NumberInput
          label="Perda máx. por trade (%)"
          value={form.maxLossTradePct}
          onChange={(v) => setForm((f) => ({ ...f, maxLossTradePct: v }))}
        />
        <NumberInput
          label="Perda máx. diária (%)"
          value={form.maxLossDayPct}
          onChange={(v) => setForm((f) => ({ ...f, maxLossDayPct: v }))}
        />
      </div>

      <div className="flex justify-end mt-3">
        <button className="btn" onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          Guardar
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   MULTIPLIERS
   ===================================================== */

function MultipliersCard({ uid, user }: { uid: string; user: UserDoc }) {
  const [form, setForm] = useState<TradeMultipliers>({
    curta: user.multipliers?.curta ?? 6,
    normal: user.multipliers?.normal ?? 3,
    longa: user.multipliers?.longa ?? 1.8,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateMultipliers(uid, form);
      // guarda também no localStorage para o OrderForm->typeFactor
      if (typeof window !== "undefined") {
        localStorage.setItem("tradeMultipliers", JSON.stringify(form));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <div className="icon-btn"><SlidersHorizontal className="h-4 w-4" /></div>
        <h3 className="font-semibold">Alavancagens (tamanho recomendado)</h3>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <NumberInput
          label="Curta (×)"
          step={0.1}
          value={form.curta}
          onChange={(v) => setForm((f) => ({ ...f, curta: v }))}
        />
        <NumberInput
          label="Normal (×)"
          step={0.1}
          value={form.normal}
          onChange={(v) => setForm((f) => ({ ...f, normal: v }))}
        />
        <NumberInput
          label="Longa (×)"
          step={0.1}
          value={form.longa}
          onChange={(v) => setForm((f) => ({ ...f, longa: v }))}
        />
      </div>

      <p className="small text-sub mt-2">
        Estes fatores multiplicam o <b>saldo atual</b> para sugerir o tamanho da posição.
      </p>

      <div className="flex justify-end mt-3">
        <button className="btn" onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          Guardar
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   DANGER ZONE
   ===================================================== */

function DangerZone({ uid, user }: { uid: string; user: UserDoc }) {
  const [confirm, setConfirm] = useState("");
  const [newStart, setNewStart] = useState<number>(user.startingBalance || 0);
  const [currency, setCurrency] = useState<string>(user.preferences?.currency || user.currency || "EUR");
  const [busy, setBusy] = useState(false);

  const canReset = confirm.trim().toUpperCase() === "RESET";

  const doReset = async () => {
    if (!canReset) return;
    setBusy(true);
    try {
      // apaga trades e movimentos
      await clearAccountData(uid);
      // repõe saldo e moeda
      await resetTradingAccount(uid, newStart, currency);
    } finally {
      setBusy(false);
      setConfirm("");
    }
  };

  return (
    <div className="card md:col-span-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="icon-btn"><AlertTriangle className="h-4 w-4" /></div>
        <h3 className="font-semibold">Zona de perigo</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="label">Novo saldo inicial</label>
          <input
            className="input w-full"
            type="number"
            step="0.01"
            value={newStart}
            onChange={(e) => setNewStart(parseFloat(e.target.value || "0"))}
          />
        </div>
        <div>
          <label className="label">Moeda</label>
          <select
            className="select w-full"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option>EUR</option>
            <option>USD</option>
            <option>BRL</option>
            <option>GBP</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label">Confirmação</label>
          <input
            className="input w-full"
            placeholder='Escreve "RESET" para confirmar'
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <p className="small text-sub mt-1">
            Isto apaga <b>todas</b> as trades e movimentos e repõe a conta com o saldo/moeda indicados.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center mt-3">
        <div className="inline-flex items-center gap-2 small text-sub">
          <RefreshCcw className="h-4 w-4" />
          Podes sempre redefinir novamente mais tarde.
        </div>
        <button
          className="btn bg-red-500/90 hover:bg-red-500"
          disabled={!canReset || busy}
          onClick={doReset}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Reset da conta
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   SMALL INPUT
   ===================================================== */

function NumberInput({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input w-full"
        type="number"
        step={step}
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value || "0"))}
      />
    </div>
  );
}
