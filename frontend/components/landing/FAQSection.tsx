import Link from "next/link";
import { PanelShell } from "@/components/ui/PanelShell";

const FAQS = [
  {
    q: "Live data or mock?",
    a: (
      <>
        Set{" "}
        <span className="font-mono text-xs text-emerald-300/90">NEXT_PUBLIC_API_BASE_URL</span>{" "}
        to wire the Query Console to the live Nest backend. Without it, the console stays in preview mode.
      </>
    ),
  },
  {
    q: "Where is the console?",
    a: (
      <>
        Open{" "}
        <Link href="/dashboard" className="text-cyan-300/90 underline-offset-4 hover:underline">
          /dashboard
        </Link>{" "}
        for the full workbench.
      </>
    ),
  },
];

export function FAQSection() {
  return (
    <section
      id="faq"
      className="relative mx-auto w-full max-w-[900px] px-4 py-24 sm:px-6 sm:py-32 lg:px-8"
    >
      <div className="mb-12 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.45em] text-cyan-300/85 sm:text-[11px]">
          [ FAQ ]
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
          Questions
        </h2>
      </div>

      <div className="grid gap-4">
        {FAQS.map((faq) => (
          <div key={faq.q}>
            <PanelShell
              className="h-full border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm"
            >
              <h3 className="text-lg font-medium text-white">{faq.q}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300/80">{faq.a}</p>
            </PanelShell>
          </div>
        ))}
      </div>
    </section>
  );
}
