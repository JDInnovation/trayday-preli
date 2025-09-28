// src/app/profile/page.tsx
"use client";

import React from "react";
import NextImage from "next/image"; // ⬅️ evita colisão com window.Image
import HeaderBar from "@/components/HeaderBar";
import { auth, storage } from "@/lib/firebase.client";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Camera, Loader2 } from "lucide-react";

type U = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

const MAX_FILE_MB = 2;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

// Carrega e comprime para JPEG (sem colisão com NextImage)
async function compressImageToJpeg(file: File, maxEdge = 768, quality = 0.9): Promise<Blob> {
  const dataURL = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("reader"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

  const img: HTMLImageElement = new (window as any).Image();
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("img"));
    img.src = dataURL;
  });

  const { width, height } = img;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-ctx");
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", quality)
  );
  return blob;
}

export default function ProfilePage() {
  const [user, setUser] = React.useState<U | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string>("");

  React.useEffect(() => {
    const off = onAuthStateChanged(auth, (u) =>
      setUser(
        u
          ? { uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL }
          : null
      )
    );
    return () => off();
  }, []);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMsg("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      setMsg("Formato inválido. Usa JPEG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setMsg(`Ficheiro grande (${(file.size / 1048576).toFixed(1)} MB). Máx ${MAX_FILE_MB} MB.`);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    try {
      setBusy(true);
      const jpegBlob = await compressImageToJpeg(file, 768, 0.9);

      if (!storage || !user) throw new Error("no-storage-or-user");
      const key = `avatars/${user.uid}.jpg`;
      const r = ref(storage, key);
      await uploadBytes(r, jpegBlob, {
        contentType: "image/jpeg",
        cacheControl: "public,max-age=31536000,immutable",
      });
      const publicUrl = await getDownloadURL(r);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: publicUrl });
      }

      setMsg("Imagem atualizada com sucesso!");
      setPreview(publicUrl);
      setUser((u) => (u ? { ...u, photoURL: publicUrl } : u));
    } catch (err) {
      console.error(err);
      setMsg("Falha no upload. Tenta novamente.");
    } finally {
      setBusy(false);
      try {
        if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
      } catch {}
    }
  };

  return (
    <>
      <HeaderBar />
      <main className="max-w-4xl mx-auto p-4 md:p-6 pt-20 space-y-4">
        <header className="flex items-center gap-3">
          <div className="icon-btn">
            <Camera className="w-5 h-5" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold">Perfil</h1>
        </header>

        <section className="card grid md:grid-cols-[120px,1fr] gap-4 items-start">
          <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10">
            <NextImage
              src={preview || user?.photoURL || "/avatar-placeholder.png"}
              alt="Avatar"
              fill
              sizes="96px"
              className="object-cover"
              priority
            />
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-sm text-white/70">Email</div>
              <div className="font-medium">{user?.email ?? "—"}</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className={`btn ${busy ? "opacity-60 pointer-events-none" : ""}`}>
                <input
                  type="file"
                  accept={ACCEPTED.join(",")}
                  className="hidden"
                  onChange={onPickFile}
                  disabled={busy}
                />
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                <span>Carregar nova imagem</span>
              </label>
              <span className="small text-sub">JPEG/PNG/WEBP • até {MAX_FILE_MB} MB</span>
            </div>

            {msg && <div className="small">{msg}</div>}
          </div>
        </section>
      </main>
    </>
  );
}
