import Link from "next/link";

import { WorkbenchGrid } from "@/components/dashboard/WorkbenchGrid";

export default function DashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <nav className="max-w-200 flex items-center rounded-full px-4 py-3 text-sm text-slate-300 shadow-[0_18px_48px_rgba(2,6,23,0.32)] backdrop-blur-xl sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.34em] text-slate-100 shadow-inner shadow-white/[0.04] transition-colors hover:border-white/25 hover:bg-white/[0.1] hover:text-white"
        >
          返回首页
        </Link>
      </nav>

      <section className="flex min-h-[calc(100vh-6.5rem)] items-center py-8 sm:py-10">
        <WorkbenchGrid />
      </section>
    </main>
  );
}
