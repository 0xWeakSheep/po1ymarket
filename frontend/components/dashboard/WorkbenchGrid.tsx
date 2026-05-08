import { FadeUpPanel } from "@/components/ui/FadeUpPanel";
import { PanelShell } from "@/components/ui/PanelShell";
import { PixelLabel } from "@/components/ui/PixelLabel";
import { QueryConsole } from "@/components/dashboard/QueryConsole";

const steps = [
  "Choose market ID or write a custom market question.",
  "Set NEXT_PUBLIC_API_BASE_URL so the browser can reach the Nest API (see frontend/.env.example).",
  "Run Find Sources — the console calls POST /api/v1/recommendations and shows ranked sources.",
];

// lg 两栏：左栏不小于 280px，余下宽度按 1fr : 2fr（约 1/3 与 2/3）分配。
const lgTwoColumnWorkbench =
  "lg:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)] lg:items-stretch";

// 控制台区域最小高度上限，避免小屏纵向过矮、大屏无谓过高。
const queryConsoleShell = "flex h-full min-h-[min(72vh,820px)] flex-col";

export function WorkbenchGrid() {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className={`grid gap-5 ${lgTwoColumnWorkbench}`}>
        <FadeUpPanel className="min-h-0" delay={0}>
          <PanelShell id="intro" className="flex h-full flex-col p-6 sm:p-7">
            <PixelLabel>Overview</PixelLabel>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
              Find Signal Before the Market Moves
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-300/85">
              Source recommendation workbench — configure inputs on the right, read ranked output in
              the same view. Ranking and URLs always come from your configured API, not from bundled
              fixtures.
            </p>

            <h2 className="mt-8 text-xs font-medium uppercase tracking-[0.28em] text-slate-200">
              How it works
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-4 text-sm leading-7 text-slate-300/85 marker:text-slate-500">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>

            <p className="mt-auto pt-8 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Frontend: UI + API client · Backend: scoring & data (backend/)
            </p>
          </PanelShell>
        </FadeUpPanel>

        <FadeUpPanel className="min-h-0" delay={0.06}>
          <div
            id="console"
            className={queryConsoleShell}
            aria-label="Query console — primary workspace"
          >
            <QueryConsole />
          </div>
        </FadeUpPanel>
      </div>

      <PanelShell id="api" className="p-6 sm:p-7">
        <h2 className="text-sm font-medium uppercase tracking-[0.28em] text-slate-200">
          API reference
        </h2>
        <p className="mt-4 font-mono text-sm text-white">POST /api/v1/recommendations</p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300/85">
          Implemented by the Nest service in <span className="font-mono text-xs">backend/</span>.
          The Next app only serializes the form, calls this endpoint from the browser, and renders
          the JSON response — no prediction or ranking logic lives in the frontend bundle.
        </p>
      </PanelShell>
    </div>
  );
}
