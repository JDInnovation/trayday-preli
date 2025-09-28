import { NextRequest, NextResponse } from "next/server";


const BASE = "https://cryptopanic.com/api/v1/posts/";


export const revalidate = 180; // 3 minutos (cache lato)


export async function GET(req: NextRequest) {
const { searchParams } = new URL(req.url);
const envToken = process.env.CRYPTOPANIC_API_TOKEN;
const overrideToken = searchParams.get("token"); // opcional (para testes)
const token = overrideToken || envToken;


if (!token) {
return NextResponse.json(
{ error: "Falta CRYPTOPANIC_API_TOKEN no .env" },
{ status: 500 }
);
}


// Repassamos alguns filtros úteis do CryptoPanic
const passthrough = ["page", "kind", "currencies", "regions", "filter", "lang"]; // ex.: kind=news|media, filter=hot|important
const params = new URLSearchParams();
params.set("auth_token", token);
params.set("public", "true"); // recomendado p/ plano free
for (const key of passthrough) {
const v = searchParams.get(key);
if (v) params.set(key, v);
}


const url = `${BASE}?${params.toString()}`;
try {
const res = await fetch(url, { next: { revalidate: 180 } });
if (!res.ok) {
const text = await res.text();
return NextResponse.json(
{ error: "Erro no provedor", status: res.status, body: text },
{ status: 502 }
);
}
const data = await res.json();
return NextResponse.json(data, { status: 200 });
} catch (err: any) {
return NextResponse.json(
{ error: "Falha na chamada externa", detail: String(err?.message || err) },
{ status: 502 }
);
}
}