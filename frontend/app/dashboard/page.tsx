import Link from "next/link";

import { WorkbenchGrid } from "@/components/dashboard/WorkbenchGrid";

export default function DashboardPage() {
  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav" aria-label="Dashboard navigation">
        <Link href="/" className="retro-button">
          返回首页
        </Link>
        <span className="dashboard-counter">Workbench: 0002 | Query Lab Online</span>
      </nav>

      <section className="dashboard-shell">
        <WorkbenchGrid />
      </section>
    </main>
  );
}
