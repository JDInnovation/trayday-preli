// src/app/noticias/page.tsx
"use client";

import React from "react";
import HeaderBar from "@/components/HeaderBar";
import { Newspaper, RefreshCcw } from "lucide-react";

type CPPost = {
  id: number | string;
  title?: string;
  published_at?: string;
  url?: string;
  domain?: string;
  source?: { title?: string; domain?: string };
  kind?: string;
  currencies?: { code: string }[];
  votes?: { negative?: number; positive?: number; important?: number };
};

export default function NoticiasPage() {
  const [items, setItems] = React.useState<CPPost[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"hot" | "rising" | "latest">("hot");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        filter,
        kind: "news",
        per_page: "50",
        // podes passar currencies/regions se quiseres:
        // currencies: "BTC,ETH",
        // regions: "en,pt",
      });
      const res = await fetch(`/api/cryptopanic?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setItems(Array.isArray(data.results) ? data.results : []);
    } catch (e: any) {
      console.error(e);
      setError("Não foi possível carregar. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <HeaderBar />
      <main className="max-w-6xl mx-auto p-4 md:p-6 pt-20 space-y-4">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="icon-btn">
              <Newspaper className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold">Notícias</h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="select"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              aria-label="Filtro"
              title="Filtro de popularidade"
            >
              <option value="hot">Em alta</option>
              <option value="rising">A subir</option>
              <option value="latest">Mais recentes</option>
            </select>
            <button className="btn-ghost" onClick={load} title="Recarregar">
              <RefreshCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </div>
        </header>

        {loading && (
          <div className="card">
            <div className="animate-pulse h-5 w-40 bg-white/10 rounded mb-2" />
            <div className="animate-pulse h-24 bg-white/5 rounded" />
          </div>
        )}

        {error && !loading && (
          <div className="card border-danger/30">
            <div className="text-danger">{error}</div>
            <button className="btn mt-2" onClick={load}>Tentar novamente</button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="card">Sem resultados para este filtro.</div>
        )}

        <div className="grid gap-3">
          {items.map((it) => (
            <ArticleCard key={String(it.id)} item={it} />
          ))}
        </div>
      </main>
    </>
  );
}

function ArticleCard({ item }: { item: CPPost }) {
  const [open, setOpen] = React.useState(false);
  const pub = item.published_at ? new Date(item.published_at) : null;
  const domain = item.source?.domain || item.domain || (item.url ? new URL(item.url).hostname : "");

  return (
    <article className="card hover:bg-white/[0.03] transition">
      <header
        className="flex items-start justify-between gap-3 cursor-pointer"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="space-y-1">
          <h3 className="font-semibold leading-snug">{item.title || "Sem título"}</h3>
          <div className="small text-sub">
            {pub ? pub.toLocaleString("pt-PT") : "—"} • {domain || "—"}
          </div>
        </div>
        <div className="small text-sub shrink-0">{open ? "−" : "+"}</div>
      </header>

      {open && (
        <div className="mt-2 space-y-2">
          {!!item.currencies?.length && (
            <div className="small text-sub">
              Moedas: {item.currencies.map((c) => c.code).join(", ")}
            </div>
          )}
          {!!item.votes && (
            <div className="small text-sub">
              👍 {item.votes.positive ?? 0} • 👎 {item.votes.negative ?? 0} • ⭐ {item.votes.important ?? 0}
            </div>
          )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="btn"
              title="Abrir fonte"
            >
              Ler na fonte
            </a>
          )}
        </div>
      )}
    </article>
  );
}
