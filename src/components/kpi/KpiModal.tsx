"use client";

import { ReactNode } from "react";

export default function KpiModal({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-0 p-3 md:p-6 flex items-center justify-center">
        <div className="w-full max-w-3xl rounded-xl border border-line bg-slate-900 shadow-xl">
          <div className="flex items-start justify-between p-3 md:p-4 border-b border-line">
            <div>
              <h4 className="font-semibold">{title}</h4>
              {description ? <p className="small text-sub mt-1">{description}</p> : null}
            </div>
            <button className="btn-ghost" onClick={onClose} aria-label="Fechar">✕</button>
          </div>
          <div className="p-3 md:p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
