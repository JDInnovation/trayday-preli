// src/app/layout.tsx
import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trading Dashboard — Pro",
  description: "Painel de performance de trading — Next.js + Firebase",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-PT">
      {/* Mantém o bg e alturas definidos no teu globals.css */}
      <body className="min-h-screen">
        {/* Removido: topbar antiga */}
        <main className="max-w-6xl mx-auto p-4">{children}</main>
      </body>
    </html>
  );
}
