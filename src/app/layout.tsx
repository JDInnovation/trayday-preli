import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trading Dashboard — Pro",
  description: "Painel de performance de trading — Next.js + Firebase"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body className="min-h-screen">
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-line bg-bg/80 backdrop-blur">
          <div className="px-2 py-1 rounded-full border border-slate-700 text-sub font-semibold">
            TradeWay
          </div>
        </div>
        <main className="max-w-6xl mx-auto p-4">{children}</main>
      </body>
    </html>
  );
}
