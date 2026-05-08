import type { ReactNode } from "react";

export function PixelLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300/90">
      {children}
    </span>
  );
}
