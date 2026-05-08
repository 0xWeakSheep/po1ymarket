import Link from "next/link";

import { WorkbenchGrid } from "@/components/dashboard/WorkbenchGrid";

export default function DashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <nav className="sticky top-4 z-30 flex items-center justify-between rounded-full border border-white/10 bg-black/45 px-4 py-3 text-sm text-slate-300 shadow-[0_18px_48px_rgba(2,6,23,0.32)] backdrop-blur-xl sm:px-6">
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-[0.34em] text-slate-100 transition-colors hover:text-white"
        >
          po1market
        </Link>
        <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.22em] text-slate-400 sm:text-[11px]">
          <a className="cursor-pointer transition-colors duration-200 hover:text-slate-200" href="#intro">
            Overview
          </a>
          <a className="cursor-pointer transition-colors duration-200 hover:text-slate-200" href="#console">
            Console
          </a>
          <a className="cursor-pointer transition-colors duration-200 hover:text-slate-200" href="#api">
            API
          </a>
          <Link
            className="cursor-pointer transition-colors duration-200 hover:text-slate-200"
            href="/#faq"
          >
            FAQ
          </Link>
        </div>
      </nav>

      <section className="flex min-h-[calc(100vh-6.5rem)] items-center py-8 sm:py-10">
        <WorkbenchGrid />
      </section>
    </main>
  );
}
