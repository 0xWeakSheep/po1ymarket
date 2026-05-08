import { PanelShell } from "@/components/ui/PanelShell";

const FEATURES = [
  {
    title: "Typed Request",
    desc: "Structured market queries with validated parameters. Every field is typed and checked before hitting the pipeline.",
  },
  {
    title: "Ranked Sources",
    desc: "Evidence scored by resolution relevance, not keyword density. Tier-1 sources surface first.",
  },
  {
    title: "Live API",
    desc: "Wire directly to the NestJS backend. Set NEXT_PUBLIC_API_BASE_URL and the console goes live instantly.",
  },
];

export function FeatureSection() {
  return (
    <section
      id="features"
      className="relative mx-auto w-full max-w-[900px] px-4 py-24 sm:px-6 sm:py-32 lg:px-8"
    >
      <div className="mb-12 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.45em] text-cyan-300/85 sm:text-[11px]">
          [ Features ]
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
          How it works
        </h2>
      </div>

      <div className="grid gap-5">
        {FEATURES.map((f, i) => (
          <div key={f.title}>
            <PanelShell
              className="h-full border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm sm:p-8"
            >
              <div className="flex h-full flex-col sm:flex-row sm:items-start sm:gap-6">
                <span className="feature-number shrink-0 font-mono text-[10px] uppercase tracking-[0.32em] text-slate-500">
                  0{i + 1}
                </span>
                <div>
                  <h3 className="mt-2 text-lg font-semibold text-white sm:mt-0">{f.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-300/80">{f.desc}</p>
                </div>
              </div>
            </PanelShell>
          </div>
        ))}
      </div>
    </section>
  );
}
