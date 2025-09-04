"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase.client";
import { useAuth } from "@/lib/useAuth";
import { User as UserIcon, Save, Calendar } from "lucide-react";

type AvatarKey = "chart" | "target" | "bolt";
const AVATARS: Array<{ key: AvatarKey; label: string; emoji: string }> = [
  { key: "chart", label: "Chart", emoji: "📈" },
  { key: "target", label: "Target", emoji: "🎯" },
  { key: "bolt", label: "Bolt", emoji: "⚡" },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [displayName, setDisplayName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [birthdate, setBirthdate] = React.useState(""); // YYYY-MM-DD
  const [avatar, setAvatar] = React.useState<AvatarKey>("chart");

  // Redireciona para login quando soubermos que NÃO há user
  React.useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Carrega o perfil quando houver user
  React.useEffect(() => {
    let cancel = false;
    async function load() {
      if (!user) return;
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        const data = snap.data() || {};
        const p = data.profile || {};

        if (p.displayName) setDisplayName(String(p.displayName));
        if (p.bio) setBio(String(p.bio));
        if (p.birthdate) setBirthdate(String(p.birthdate));
        if (p.avatarKey && ["chart", "target", "bolt"].includes(p.avatarKey)) {
          setAvatar(p.avatarKey as AvatarKey);
        }
      } catch {
        if (!cancel) setError("Falha a carregar perfil.");
      }
    }
    load();
    return () => {
      cancel = true;
    };
  }, [user]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, {
        "profile.displayName": displayName.trim(),
        "profile.bio": bio.trim(),
        "profile.birthdate": birthdate || null,
        "profile.avatarKey": avatar,
      });
    } catch {
      setError("Não foi possível guardar o perfil.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="opacity-80">A carregar…</div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Perfil</h1>
          <p className="opacity-70 text-sm">
            Personaliza a tua identidade na plataforma.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 opacity-70 text-sm">
          <UserIcon className="w-4 h-4" />
          {user.email}
        </div>
      </header>

      {error && (
        <div className="rounded-lg bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/20 p-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={save} className="card space-y-5">
        {/* Avatar picker */}
        <div className="space-y-2">
          <label className="text-xs opacity-70">Avatar</label>
          <div className="grid grid-cols-3 gap-2">
            {AVATARS.map((a) => {
              const active = avatar === a.key;
              return (
                <button
                  type="button"
                  key={a.key}
                  onClick={() => setAvatar(a.key)}
                  className={`rounded-xl px-3 py-3 ring-1 text-sm transition
                    ${active ? "ring-white/40 bg-white/10" : "ring-white/10 bg-white/5 hover:bg-white/10"}`}
                  aria-pressed={active}
                  title={a.label}
                >
                  <div className="text-2xl">{a.emoji}</div>
                  <div className="mt-1 text-xs opacity-80">{a.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Display name */}
        <div className="space-y-2">
          <label className="text-xs opacity-70">Nome de utilizador</label>
          <input
            className="w-full rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
            placeholder="O teu nome"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <label className="text-xs opacity-70">Descrição</label>
          <textarea
            rows={4}
            className="w-full rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
            placeholder="Fala um pouco sobre a tua abordagem e objetivos."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        {/* Birthdate */}
        <div className="space-y-2">
          <label className="text-xs opacity-70">Data de nascimento</label>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 opacity-70" />
            <input
              type="date"
              className="rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 bg-white/10 hover:bg-white/15 ring-1 ring-white/10 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Guardar perfil
          </button>
        </div>
      </form>
    </main>
  );
}
