// src/app/api/cryptopanic/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // sem cache estática
export const revalidate = 0;

function getToken() {
  // 1º: Vercel env
  const fromEnv = process.env.CRYPTOPANIC_TOKEN || process.env.NEXT_PUBLIC_CRYPTOPANIC_KEY;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  // 2º: fallback (apenas para tua conveniência local; remove em produção se quiseres)
  return "3989fa2e280701f93e1724228eaa32709105cf4b";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = getToken();

    // defaults sensatos (podes sobrepor via query)
    const params = new URLSearchParams({
      auth_token: token,
      public: "true",       // modo público (recomendado p/ apps web)
      kind: searchParams.get("kind") || "news",
      filter: searchParams.get("filter") || "hot",
      currencies: searchParams.get("currencies") || "", // ex: "BTC,ETH"
      regions: searchParams.get("regions") || "",       // ex: "en,pt"
      page: searchParams.get("page") || "",
      per_page: searchParams.get("per_page") || "50",
    });

    // limpar vazios
    Array.from(params.keys()).forEach((k) => {
      if (!params.get(k)) params.delete(k);
    });

    const url = `https://cryptopanic.com/api/v1/posts/?${params.toString()}`;

    const r = await fetch(url, {
      // evita que o fetch do lado do servidor seja bloqueado por UA
      headers: { "User-Agent": "TrayDay/1.0 (+https://vercel.app)" },
      cache: "no-store",
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `Upstream ${r.status}`, detail: text.slice(0, 500) },
        { status: r.status }
      );
    }

    const data = await r.json();
    return NextResponse.json({ ok: true, ...data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "proxy_failed", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
