// src/app/noticias/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import HeaderBar from "@/components/HeaderBar";
import {
  Newspaper,
  Flame,
  Star,
  Globe,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

// Tipagem mínima do payload do CryptoPanic
type CPPost = {
  id: string | number;
  title: string;
  url: string;
  domain?: string;
  source?: { title?: string; domain?: string } | null;
  kind?: "news" | "media" | string;
  created_at?: string; // ISO
  published_at?: string; // ISO
  currencies?: Array<{ code: string; title?: string }>;
};

function timeAgo(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `há ${days} d`;
}

const CURRENCY_PRESETS: Array<{ key: string; label: string; val: string }> = [
  { key: "all", label: "Todas", val: "" },
  { key: "btc", label: "BTC", val: "btc" },
  { key: "eth", label: "ETH", val: "eth" },
  { key: "sol", label: "SOL", val: "sol" },
  { key: "xrp", label: "XRP", val: "xrp" },
  { key: "ada", label: "ADA", val: "ada" },
];

export default function NoticiasPage() {
  const [items, setItems] = React.useState<CPPost[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const [expanded, setExpanded] = React.useState<
    Record<string | number, boolean>
  >({});

  // Filtros
  const [kind, setKind] = React.useState<"all" | "news" | "media">("all");
  const [flt, setFlt] = React.useState<"" | "hot" | "important">("hot");
  const [curr, setCurr] = React.useState<string>("");

  const filtersKey = `${kind}|${flt}|${curr}`;

  async function load(reset: boolean = false) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (kind !== "all") params.set("kind", kind);
      if (flt) params.set("filter", flt);
      if (curr) params.set("currencies", curr);
      params.set("page", String(reset ? 1 : page));

      const res = await fetch(`/api/cryptopanic?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      const nextExists = Boolean((data as any)?.next);
      const results: CPPost[] = (data as any)?.results || [];

      setItems((prev) => (reset ? results : [...prev, ...results]));
      setHasMore(nextExists || results.length > 0);
      setPage((p) => (reset ? 2 : p + 1));
    } catch {
      setError("Não foi possível carregar agora. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  const toggle = (id: string | number) =>
    setExpanded((m) => ({ ...m, [id]: !m[id] }));

  return (
    <>
      <HeaderBar />
      <main className="max-w-5xl mx-auto p-4 md:p-6 pt-20 space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5" />
            <h1 className="text-xl md:text-2xl font-bold">Notícias</h1>
          </div>
          <button
            className="btn-ghost"
            onClick={() => load(true)}
            disabled={loading}
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden md:inline">Atualizar</span>
          </button>
        </header>

        {/* Filtros */}
        <section className="card flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "news", "media"] as const).map((k) => (
              <button
                key={k}
                className={`chip ${kind === k ? "ring-1" : ""}`}
                onClick={() => setKind(k)}
              >
                {k === "all" ? "Todas" : k === "news" ? "News" : "Media"}
              </button>
            ))}

            <div className="mx-2 w-px h-6 bg-white/10" />

            {[
              {
                key: "hot",
                label: "Em alta",
                icon: <Flame className="w-4 h-4" />,
              },
              {
                key: "important",
                label: "Importante",
                icon: <Star className="w-4 h-4" />,
              },
            ].map((f) => (
              <button
                key={f.key}
                className={`chip ${flt === (f.key as any) ? "ring-1" : ""}`}
                onClick={() => setFlt(f.key as any)}
                title={f.label}
              >
                {f.icon}
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="small text-sub">Moeda:</span>
            {CURRENCY_PRESETS.map((c) => (
              <button
                key={c.key}
                className={`chip ${curr === c.val ? "ring-1" : ""}`}
                onClick={() => setCurr(c.val)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </section>

        {/* Lista */}
        {error && <div className="card text-danger">{error}</div>}

        <section className="grid gap-3">
          {items.map((it) => {
            const when = it.published_at || it.created_at;
            const src = it.source?.title || it.domain || "Fonte";
            const open = !!expanded[it.id];
            return (
              <article key={it.id} className="card">
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2">
                    <span className="badge">
                      <Globe className="w-3 h-3" /> {src}
                    </span>
                    {it.kind && <span className="badge">{it.kind}</span>}
                  </div>
                  <span className="small text-sub">{timeAgo(when)}</span>
                </div>

                <button
                  className="mt-2 text-left"
                  onClick={() => toggle(it.id)}
                >
                  <div className="text-base md:text-lg font-semibold leading-tight">
                    {it.title}
                  </div>
                  <div className="small text-sub">
                    {open ? "Clique para recolher" : "Clique para expandir"}
                  </div>
                </button>

                {open && (
                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {(it.currencies || []).map((c) => (
                          <span key={c.code} className="badge">
                            {c.code}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={it.url}
                          target="_blank"
                          className="btn"
                          title="Abrir na fonte"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Abrir na fonte</span>
                        </Link>
                      </div>
                    </div>
                    {/* Thumbnail opcional:
                    <img src={thumbURL} alt="" className="w-40 h-24 object-cover rounded-lg border border-[var(--border)]" />
                    */}
                  </div>
                )}
              </article>
            );
          })}

          {/* Loading skeleton */}
          {loading && items.length === 0 && (
            <div className="card opacity-70">A carregar…</div>
          )}
        </section>

        {/* Load more */}
        <div className="flex justify-center py-2">
          <button
            className="btn"
            onClick={() => load(false)}
            disabled={loading || !hasMore}
          >
            {loading
              ? "A carregar…"
              : hasMore
              ? "Carregar mais"
              : "Sem mais resultados"}
          </button>
        </div>
      </main>
    </>
  );
}
