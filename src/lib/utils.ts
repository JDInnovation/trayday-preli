export const pad2 = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
export const startOfMonth = (y: number, m: number) => new Date(y, m, 1);
export const endOfMonth = (y: number, m: number) => new Date(y, m+1, 0, 23, 59, 59, 999);
export const daysInMonth = (y: number, m: number) => new Date(y, m+1, 0).getDate();
export const monthKey = (y: number, m: number) => `${y}-${pad2(m+1)}`;
export const monthLabel = (y: number, m: number) =>
  new Date(y, m, 1).toLocaleDateString("pt-PT", { month: "long", year: "numeric" });

export const fmtMoney = (v = 0, cur = "EUR") =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: cur }).format(v || 0);

export const uid = () => Math.random().toString(36).slice(2, 9);
export const typeFactor = (t: "curta" | "normal" | "longa") => (t === "curta" ? 6 : t === "longa" ? 1.8 : 3);
