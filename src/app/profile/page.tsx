"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage, auth } from "@/lib/firebase.client";
import { useAuth } from "@/lib/useAuth";
import HeaderBar from "@/components/HeaderBar";
import {
  User as UserIcon,
  Save,
  Calendar as CalendarIcon,
  ImageUp,
  Trash2,
  Loader2,
  Check,
} from "lucide-react";

// Avatar "temas" existentes — usados como fallback quando não há foto
// (mantidos para compatibilidade com a tua versão anterior)
// chart/target/bolt => emojis 📈 🎯 ⚡
type AvatarKey = "chart" | "target" | "bolt";
const AVATARS: Array<{ key: AvatarKey; label: string; emoji: string }> = [
  { key: "chart", label: "Chart", emoji: "📈" },
  { key: "target", label: "Target", emoji: "🎯" },
  { key: "bolt", label: "Bolt", emoji: "⚡" },
];

// ===== Helpers para imagem
async function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
      (img as any)._el = img;
    });
    const imgEl = new Image();
    imgEl.src = url;
    return imgEl;
  } finally {
    // não revoga já — usamos o URL no preview
  }
}

function drawCoverToCanvas(img: HTMLImageElement, size = 512): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-2d");
  canvas.width = size;
  canvas.height = size;
  // cover crop center
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;
  const sRatio = sw / sh;
  const dRatio = 1; // square
  let sx = 0,
    sy = 0,
    sW = sw,
    sH = sh;
  if (sRatio > dRatio) {
    // imagem mais larga => recorta lados
    sW = Math.floor(sh * dRatio);
    sx = Math.floor((sw - sW) / 2);
  } else {
    // imagem mais alta => recorta topo/baixo
    sH = Math.floor(sw / dRatio);
    sy = Math.floor((sh - sH) / 2);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sW, sH, 0, 0, size, size);
  return canvas;
}

async function canvasToWebPBlob(canvas: HTMLCanvasElement, targetKB = 256): Promise<Blob> {
  let quality = 0.92;
  for (let i = 0; i < 8; i++) {
    const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), "image/webp", quality));
    if (blob.size / 1024 <= targetKB || quality < 0.5) return blob;
    quality -= 0.1;
  }
  // fallback final
  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), "image/webp", 0.6));
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);

  const [displayName, setDisplayName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [birthdate, setBirthdate] = React.useState(""); // YYYY-MM-DD
  const [avatarKey, setAvatarKey] = React.useState<AvatarKey>("chart");
  const [photoURL, setPhotoURL] = React.useState<string | null>(null);

  // upload state
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [previewURL, setPreviewURL] = React.useState<string | null>(null);

  // Redireciona para login quando sabemos que NÃO há user
  React.useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
  }, [loading, user, router]);

  // Carrega perfil
  React.useEffect(() => {
    let cancel = false;
    async function load() {
      if (!user) return;
      try {
        const refDoc = doc(db, "users", user.uid);
        const snap = await getDoc(refDoc);
        const data = snap.data() || {};
        const p = data.profile || {};
        if (p.displayName) setDisplayName(String(p.displayName));
        if (p.bio) setBio(String(p.bio));
        if (p.birthdate) setBirthdate(String(p.birthdate));
        if (p.avatarKey && ["chart", "target", "bolt"].includes(p.avatarKey)) {
          setAvatarKey(p.avatarKey as AvatarKey);
        }
        if (p.photoURL) setPhotoURL(String(p.photoURL));
      } catch (e) {
        if (!cancel) setError("Falha a carregar perfil.");
      }
    }
    load();
    return () => {
      cancel = true;
    };
  }, [user]);

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const refDoc = doc(db, "users", user.uid);
      await updateDoc(refDoc, {
        "profile.displayName": displayName.trim(),
        "profile.bio": bio.trim(),
        "profile.birthdate": birthdate || null,
        "profile.avatarKey": avatarKey,
        // photoURL já é guardado no upload; aqui só garantimos que se mantém
        ...(photoURL ? { "profile.photoURL": photoURL } : {}),
      });
      setOkMsg("Perfil guardado com sucesso.");
    } catch (e) {
      console.error(e);
      setError("Não foi possível guardar o perfil.");
    } finally {
      setSaving(false);
      setTimeout(() => setOkMsg(null), 2500);
    }
  }

  async function handlePickFile() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // validações básicas
    if (!file.type.startsWith("image/")) {
      setError("Por favor seleciona uma imagem válida.");
      return;
    }
    const MAX_SOURCE_MB = 8; // evita fontes gigantes (antes de comprimir)
    if (file.size > MAX_SOURCE_MB * 1024 * 1024) {
      setError(`Imagem demasiado grande (>${MAX_SOURCE_MB}MB). Escolhe outra.`);
      return;
    }

    try {
      setError(null);
      setOkMsg(null);
      setUploading(true);
      setProgress(0);

      // 1) carregar e redimensionar/cortar para 512x512
      const img = await fileToImage(file);
      const canvas = drawCoverToCanvas(img, 512);

      // 2) exportar como webp <= ~256KB
      const blob = await canvasToWebPBlob(canvas, 256);
      const finalFile = new File([blob], "avatar.webp", { type: "image/webp" });

      // 3) preview local
      const url = URL.createObjectURL(finalFile);
      setPreviewURL(url);

      // 4) upload resumable para Storage
      const storagePath = `users/${user.uid}/avatar.webp`;
      const r = ref(storage, storagePath);
      const task = uploadBytesResumable(r, finalFile, {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000, immutable",
      });
      await new Promise<void>((resolve, reject) => {
        task.on(
          "state_changed",
          (s) => setProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
          reject,
          () => resolve()
        );
      });

      const downloadURL = await getDownloadURL(r);

      // 5) guardar no perfil
      const refDoc = doc(db, "users", user.uid);
      await updateDoc(refDoc, {
        "profile.photoURL": downloadURL,
        "profile.avatarKey": null,
        "profile.avatarUpdatedAt": Date.now(),
      });
      setPhotoURL(downloadURL);
      setOkMsg("Foto de perfil atualizada.");

      // opcional: atualizar também o auth
      try {
        if (auth.currentUser) {
          const { updateProfile } = await import("firebase/auth");
          await updateProfile(auth.currentUser, { photoURL: downloadURL });
        }
      } catch {}
    } catch (err: any) {
      console.error(err);
      setError("Falhou o upload da imagem.");
    } finally {
      setUploading(false);
      setTimeout(() => setOkMsg(null), 2500);
    }
  }

  async function removePhoto() {
    if (!user) return;
    try {
      setUploading(true);
      setError(null);
      setOkMsg(null);
      // tenta apagar do storage; se não existir, ignora
      const r = ref(storage, `users/${user.uid}/avatar.webp`);
      try { await deleteObject(r); } catch {}
      const refDoc = doc(db, "users", user.uid);
      await updateDoc(refDoc, {
        "profile.photoURL": null,
        "profile.avatarKey": avatarKey ?? "chart",
      });
      setPhotoURL(null);
      setOkMsg("Foto removida. A usar avatar padrão.");
    } catch (e) {
      setError("Não foi possível remover a foto.");
    } finally {
      setUploading(false);
      setTimeout(() => setOkMsg(null), 2500);
    }
  }

  if (loading || !user) {
    return (
      <>
        <HeaderBar />
        <main className="max-w-4xl mx-auto p-4 md:p-6 pt-20">
          <div className="opacity-80">A carregar…</div>
        </main>
      </>
    );
  }

  return (
    <>
      <HeaderBar />
      <main className="max-w-4xl mx-auto p-4 md:p-6 pt-20 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Perfil</h1>
            <p className="opacity-70 text-sm">Atualiza a tua foto e os teus dados pessoais.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 opacity-70 text-sm">
            <UserIcon className="w-4 h-4" />
            {user.email}
          </div>
        </header>

        {error && (
          <div className="rounded-lg bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/20 p-3 text-sm">{error}</div>
        )}
        {okMsg && (
          <div className="rounded-lg bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/20 p-3 text-sm flex items-center gap-2">
            <Check className="w-4 h-4" /> {okMsg}
          </div>
        )}

        {/* Card: Foto de perfil */}
        <section className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Foto de perfil</h2>
            <div className="text-xs opacity-70">Máx. 512×512 · ~256KB (comprimido)</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 rounded-full overflow-hidden ring-2 ring-white/15 bg-white/5">
              {photoURL ? (
                <Image src={photoURL} alt="Avatar" fill className="object-cover" sizes="96px" />
              ) : (
                <div className="w-full h-full grid place-items-center text-3xl">
                  {AVATARS.find((a) => a.key === avatarKey)?.emoji ?? "👤"}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <button type="button" className="btn" onClick={handlePickFile} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    A enviar… {progress}%
                  </>
                ) : (
                  <>
                    <ImageUp className="w-4 h-4" />
                    Carregar nova foto
                  </>
                )}
              </button>
              {photoURL && (
                <button type="button" className="btn-ghost" onClick={removePhoto} disabled={uploading}>
                  <Trash2 className="w-4 h-4" /> Remover foto
                </button>
              )}
            </div>
          </div>

          {previewURL && !uploading && (
            <div className="text-xs opacity-70">Pré-visualização local atualizada.</div>
          )}

          {/* Avatares padrão (fallback) */}
          <div className="space-y-2">
            <label className="text-xs opacity-70">Avatar padrão (fallback)</label>
            <div className="grid grid-cols-3 gap-2">
              {AVATARS.map((a) => {
                const active = avatarKey === a.key;
                return (
                  <button
                    type="button"
                    key={a.key}
                    onClick={() => setAvatarKey(a.key)}
                    className={`rounded-xl px-3 py-3 ring-1 text-sm transition ${
                      active ? "ring-white/40 bg-white/10" : "ring-white/10 bg-white/5 hover:bg-white/10"
                    }`}
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
        </section>

        {/* Formulário principal */}
        <form onSubmit={saveProfile} className="card space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Nome */}
            <div className="space-y-2">
              <label className="text-xs opacity-70">Nome de utilizador</label>
              <input
                className="w-full rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                placeholder="O teu nome"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            {/* Data de nascimento */}
            <div className="space-y-2">
              <label className="text-xs opacity-70">Data de nascimento</label>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 opacity-70" />
                <input
                  type="date"
                  className="rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                />
              </div>
            </div>
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

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 bg-white/10 hover:bg-white/15 ring-1 ring-white/10 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> A guardar…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Guardar perfil
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
