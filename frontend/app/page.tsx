import Link from "next/link";

import { GeekLandingHero } from "@/components/landing/GeekLandingHero";
import { LandingMainSections, LandingScrollingSides } from "@/components/landing/LandingDynamicIsland";

export default function Home() {
  return (
    <>
      <LandingScrollingSides />

      <nav className="sticky top-4 z-30 mx-auto flex w-full max-w-[1480px] items-center justify-between rounded-full border border-white/10 bg-black/45 px-4 py-3 text-sm text-slate-300 shadow-[0_18px_48px_rgba(2,6,23,0.32)] backdrop-blur-xl sm:px-6">
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-[0.34em] text-slate-100 transition-colors hover:text-white"
        >
          po1market
        </Link>
        <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.22em] text-slate-400 sm:text-[11px]">
          <a className="cursor-pointer transition-colors duration-200 hover:text-slate-200" href="#intro">
            Intro
          </a>
          <Link
            className="cursor-pointer transition-colors duration-200 hover:text-slate-200"
            href="/dashboard"
          >
            Workbench
          </Link>
          <Link
            className="cursor-pointer transition-colors duration-200 hover:text-slate-200"
            href="/dashboard#api"
          >
            API
          </Link>
          <a className="cursor-pointer transition-colors duration-200 hover:text-slate-200" href="#faq">
            FAQ
          </a>
        </div>
      </nav>

      <main className="relative mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-8">
        <GeekLandingHero />
        <LandingMainSections />
      </main>
    </>
  );
}
