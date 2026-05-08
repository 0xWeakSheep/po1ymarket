import Link from "next/link";
import { PanelShell } from "@/components/ui/PanelShell";

export function GeekLandingHero() {
  return (
    <section
      id="intro"
      className="relative flex min-h-screen flex-col items-center justify-center px-4 py-24 sm:px-6 lg:px-8"
      aria-labelledby="hero-title"
    >
      <PanelShell className="w-full max-w-3xl p-8 sm:p-12 lg:p-14">
        <div className="flex flex-col items-start gap-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.45em] text-cyan-300/85 sm:text-[11px]">
            [ po1market · source workbench ]
          </p>

          <h1
            id="hero-title"
            className="font-[family-name:var(--font-geist-sans)] text-4xl font-semibold leading-[1.05] tracking-[-0.055em] text-white sm:text-5xl md:text-6xl"
          >
            Find Signal Before the Market Moves
          </h1>

          <p className="max-w-xl font-mono text-sm leading-relaxed text-slate-400/95">
            <span className="text-emerald-400/90">{"// "}</span>
            Typed request → ranked URLs from your configured recommendation API. No bundled mocks;
            the console is the proof surface.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-emerald-400/35 bg-emerald-500/15 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-100 shadow-[0_12px_40px_rgba(16,185,129,0.12)] transition-colors hover:border-emerald-300/50 hover:bg-emerald-500/25 sm:text-xs"
            >
              Open workbench
            </Link>
            <Link
              href="/dashboard#api"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-200 transition-colors hover:border-white/25 hover:bg-white/[0.07] sm:text-xs"
            >
              API ref
            </Link>
          </div>
        </div>
      </PanelShell>
    </section>
  );
}
