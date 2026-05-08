import Link from "next/link";
import { PanelShell } from "@/components/ui/PanelShell";
import { ParticleNetwork } from "@/components/ui/ParticleNetwork";

export function GeekLandingHero() {
  return (
    <section
      id="intro"
      className="relative flex min-h-screen flex-col items-center justify-center px-4 py-24 sm:px-6 lg:px-8"
      aria-labelledby="hero-title"
    >
      {/* Particle network background — contained to hero */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-70">
          <ParticleNetwork />
        </div>
        {/* Radial vignette to blend particles into page */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, transparent 30%, #05060a 85%)",
          }}
        />
      </div>

      {/* Floating ambient orbs */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-orb ambient-orb-3" />
      </div>

      <PanelShell
        energyBorder
        className="relative z-10 w-full max-w-3xl p-8 backdrop-blur-sm sm:p-12 lg:p-14"
      >
        <div className="flex flex-col items-start gap-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.45em] text-cyan-300/85 sm:text-[11px]">
            [ po1market · source workbench ]
          </p>

          <h1
            id="hero-title"
            className="font-[family-name:var(--font-geist-sans)] text-4xl font-semibold leading-[1.05] tracking-[-0.055em] text-white sm:text-5xl md:text-6xl"
          >
            <span className="text-shimmer">Find Signal</span>
            <br />
            <span className="text-gradient-shift">Before the Market Moves</span>
          </h1>

          <p className="max-w-xl font-mono text-sm leading-relaxed text-slate-400/95">
            <span className="text-emerald-400/90">{"// "}</span>
            Typed request → ranked URLs from your configured recommendation API. No bundled mocks;
            the console is the proof surface.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/dashboard"
              className="group/btn relative inline-flex items-center justify-center overflow-hidden rounded-full border border-emerald-400/35 bg-emerald-500/15 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-100 shadow-[0_12px_40px_rgba(16,185,129,0.12)] transition-all duration-300 hover:border-emerald-300/50 hover:bg-emerald-500/25 hover:shadow-[0_12px_50px_rgba(16,185,129,0.22)] sm:text-xs"
            >
              <span className="relative z-10">Open workbench</span>
              <span className="btn-glow absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/btn:opacity-100" />
            </Link>
          </div>
        </div>
      </PanelShell>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
        <div className="scroll-cue flex flex-col items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-slate-500">
            Scroll
          </span>
          <div className="h-8 w-px overflow-hidden bg-slate-700/50">
            <div className="h-4 w-full animate-scroll-line bg-gradient-to-b from-cyan-400/80 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
