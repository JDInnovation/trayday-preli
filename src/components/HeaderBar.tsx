"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase.client";
import {
  Home,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Timer as TimerIcon,
  ChevronDown,
  Crown,
  Newspaper,
} from "lucide-react";

/** Tenta obter um nome “bonito” para o user */
function resolveName(u: { displayName: string | null; email: string | null } | null) {
  if (!u) return "Trader";
  if (u.displayName && u.displayName.trim().length > 0) return u.displayName.trim();
  const em = u.email || "";
  const name = em.split("@")[0]?.replace(/[._-]+/g, " ") || "Trader";
  return name
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export default function HeaderBar() {
  const pathname = usePathname();
  const router = useRouter();

  // Auth + nome
  const [user, setUser] = useState<{ email: string | null; displayName: string | null } | null>(null);
  const name = useMemo(() => resolveName(user), [user]);

  // Timer da sessão
  const [clock, setClock] = useState("00:00:00");
  const startRef = useRef<number>(Date.now());

  // Menu mobile / dropdown
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const off = onAuthStateChanged(auth, (u) => {
      setUser({ email: u?.email ?? null, displayName: u?.displayName ?? null });
    });
    startRef.current = Date.now();
    const t = setInterval(() => {
      const diff = Date.now() - startRef.current;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setClock(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    }, 1000);

    return () => {
      clearInterval(t);
      off();
    };
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target as Node)) setUserOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("pt-PT", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    []
  );

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: <Home className="h-4 w-4" /> },
    { href: "/noticias", label: "Notícias", icon: <Newspaper className="h-4 w-4" /> },
    { href: "/profile", label: "Perfil", icon: <User className="h-4 w-4" /> },
    { href: "/settings", label: "Definições", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40">
      {/* Barra principal */}
      <div className="card flex items-center justify-between gap-3">
        {/* Esquerda: logo + saudação */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard" className="shrink-0 rounded-xl overflow-hidden">
            <Image
              src="/traydayicon.png"
              width={36}
              height={36}
              alt="Tradeway"
              className="rounded-xl"
              priority
            />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold truncate">Bem-vindo, {name} </span>
              <span className="hidden md:inline small text-sub">• {today}</span>
            </div>
            <div className="md:hidden small text-sub">{today}</div>
          </div>
        </div>

        {/* Centro: navegação (desktop) */}
        <nav className="hidden md:flex items-center gap-2">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`chip ${active ? "ring-1" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {l.icon}
                <span>{l.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Direita: tempo de sessão + menu utilizador */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg border" style={{ borderColor: "var(--border)" }}>
            <TimerIcon className="h-4 w-4 opacity-80" />
            <span className="tabular-nums text-sm">{clock}</span>
          </div>

          {/* Dropdown utilizador */}
          <div className="relative" ref={userMenuRef}>
            <button
              className="btn-ghost flex items-center gap-2"
              onClick={() => setUserOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={userOpen}
            >
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center font-semibold">
                {name?.[0]?.toUpperCase() || "T"}
              </div>
              <span className="hidden sm:inline max-w-[10rem] truncate">{name}</span>
              <ChevronDown className="h-4 w-4 opacity-80" />
            </button>

            {userOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-60 rounded-xl bg-neutral-900 shadow-xl ring-1 ring-white/10 p-2 z-50"
              >
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-sm"
                  role="menuitem"
                  onClick={() => setUserOpen(false)}
                >
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/noticias"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-sm"
                  role="menuitem"
                  onClick={() => setUserOpen(false)}
                >
                  <Newspaper className="h-4 w-4" />
                  <span>Notícias</span>
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-sm"
                  role="menuitem"
                  onClick={() => setUserOpen(false)}
                >
                  <User className="h-4 w-4" />
                  <span>Perfil</span>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-sm"
                  role="menuitem"
                  onClick={() => setUserOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  <span>Definições</span>
                </Link>
                <Link
                  href="/upgrade"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-sm"
                  role="menuitem"
                  onClick={() => setUserOpen(false)}
                >
                  <Crown className="h-4 w-4" />
                  <span>Upgrade plan</span>
                </Link>

                <div className="my-2 h-px bg-white/10" />

                <button
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-danger w-full justify-start"
                  role="menuitem"
                  onClick={async () => {
                    setUserOpen(false);
                    await signOut(auth);
                    router.push("/login");
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Terminar sessão</span>
                </button>
              </div>
            )}
          </div>

          {/* Botão mobile menu */}
          <button
            className="md:hidden btn-ghost"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Menu mobile abaixo da barra */}
      {mobileOpen && (
        <div className="card mt-2 md:hidden">
          <nav className="flex flex-col gap-2">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`btn-ghost justify-start ${active ? "ring-1" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {l.icon}
                  <span className="ml-2">{l.label}</span>
                </Link>
              );
            })}
            <div className="flex items-center justify-between mt-2">
              <div className="inline-flex items-center gap-2 small text-sub">
                <TimerIcon className="h-4 w-4" />
                <span className="tabular-nums">{clock}</span>
              </div>
              <button
                className="btn-ghost text-danger"
                onClick={async () => {
                  setMobileOpen(false);
                  await signOut(auth);
                  router.push("/login");
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
