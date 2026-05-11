"use client";

import { useId, useState } from "react";

import { runRecommendationsQuery } from "@/api/recommendations";
import { PanelShell } from "@/components/ui/PanelShell";
import { PixelLabel } from "@/components/ui/PixelLabel";
import {
  EXAMPLE_MARKET_ID,
  EXAMPLE_MARKET_QUESTION,
  EXAMPLE_RESOLUTION_SOURCE,
} from "@/constants/examples";
import type { QueryMode, QueryPlanningMetaWire, RecommendationsRunState } from "@/types/recommendation";
import { formatScore, shortenUrl } from "@/utils/display";

const INITIAL_RESPONSE: RecommendationsRunState = {
  state: "no-results",
  results: [],
};

const inputGlowClass =
  "mt-2 w-full rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-white outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-slate-600 focus-visible:border-violet-400/55 focus-visible:shadow-[0_0_36px_rgba(139,92,246,0.28)] focus-visible:ring-2 focus-visible:ring-violet-500/30";

const btnBase =
  "cursor-pointer rounded-full text-xs font-medium transition-colors duration-200 sm:text-sm";

function PlanningMetaNote({ meta }: { meta: QueryPlanningMetaWire }) {
  const usedLlm = meta.query_source === "llm" && !meta.fallback_reason;
  const frameClass = usedLlm
    ? "border-emerald-500/35 bg-emerald-500/10"
    : meta.fallback_reason
      ? "border-amber-500/40 bg-amber-500/10"
      : "border-white/15 bg-white/[0.06]";

  return (
    <div
      className={`mb-4 rounded-lg border px-3 py-2.5 text-left text-xs leading-relaxed text-slate-200 ${frameClass}`}
      role="status"
    >
      <p className="font-medium text-slate-100">Query Planner</p>
      <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-slate-300/95">
        <li>已配置 Planner：{meta.planner_configured ? "是" : "否"}</li>
        <li>检索词来源：{meta.query_source === "llm" ? "LLM" : "规则"}</li>
        {meta.fallback_reason ? <li>回退原因：{meta.fallback_reason}</li> : null}
        {meta.upstream_http_status != null ? (
          <li>
            上游 HTTP：{meta.upstream_http_status}
            {meta.upstream_code ? `（${meta.upstream_code}）` : ""}
          </li>
        ) : null}
        {meta.message ? <li>{meta.message}</li> : null}
      </ul>
      {meta.debug_detail ? (
        <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded border border-white/10 bg-black/40 p-2 font-mono text-[10px] text-slate-400">
          {meta.debug_detail}
        </pre>
      ) : null}
    </div>
  );
}

type ResultsPanelProps = {
  hasSearched: boolean;
  isLoading: boolean;
  response: RecommendationsRunState;
};

function ResultsPanel({ hasSearched, isLoading, response }: ResultsPanelProps) {
  return (
    <div className="flex flex-col h-full" aria-label="Results" role="region" aria-live="polite">
      <PixelLabel>Output</PixelLabel>
      <div className="mt-4 flex-1 overflow-auto min-h-0">
        {!hasSearched ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-slate-500">
              Run a market query to preview recommended sources.
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />
            <p className="mt-3 text-sm text-slate-400">Searching…</p>
          </div>
        ) : response.state === "error" ? (
          <p className="text-sm text-rose-300">{response.errorMessage ?? "Something went wrong."}</p>
        ) : (
          <>
            {response.planning_meta ? <PlanningMetaNote meta={response.planning_meta} /> : null}
            {response.state === "no-results" ? (
              <p className="text-sm text-slate-400">No sources found. Try a richer query.</p>
            ) : (
              <div className="space-y-3">
                {response.results.map((item) => (
                  <article
                    key={item.url}
                    className="result-card rounded-xl border border-white/10 bg-white/[0.04] p-4 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-medium text-white">{item.label}</h3>
                      <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 font-mono text-[11px] text-violet-100">
                        {formatScore(item.score)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{item.reason}</p>
                    <a
                      className="mt-3 inline-block cursor-pointer text-sm text-sky-300/90 underline-offset-2 transition-colors duration-200 hover:text-sky-200 hover:underline"
                      href={item.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {item.domain}
                    </a>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function QueryConsole() {
  const regionId = useId();
  const [mode, setMode] = useState<QueryMode>("market-id");
  const [marketId, setMarketId] = useState("");
  const [marketQuestion, setMarketQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<RecommendationsRunState>(INITIAL_RESPONSE);
  const [hasSearched, setHasSearched] = useState(false);

  const hasInput =
    mode === "market-id" ? Boolean(marketId.trim()) : Boolean(marketQuestion.trim());
  const canSubmit = hasInput && !isLoading;

  async function handleSubmit() {
    if (!hasInput || isLoading) return;
    setIsLoading(true);
    setHasSearched(true);

    const next =
      mode === "market-id"
        ? await runRecommendationsQuery({ mode, marketId })
        : await runRecommendationsQuery({ mode, marketQuestion });

    setResponse(next);
    setIsLoading(false);
  }

  function onFormKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "Enter" || event.shiftKey) return;
    const target = event.target as HTMLElement;
    if (target.tagName === "TEXTAREA") return;
    event.preventDefault();
    void handleSubmit();
  }

  return (
    <section
      className="grid grid-cols-1 lg:grid-cols-[minmax(0,40%)_1fr] gap-6 h-full"
      aria-labelledby={`${regionId}-title`}
      onKeyDown={onFormKeyDown}
    >
      {/* Left panel — Query Input */}
      <PanelShell
        energyBorder
        className="dashboard-panel h-full p-6 backdrop-blur-2xl sm:p-8"
      >
        <div className="relative z-10 flex h-full flex-col">
          <div className="mb-5 flex flex-wrap items-center justify-start gap-3">
            <PixelLabel>
              <span id={`${regionId}-title`}>Query Console</span>
            </PixelLabel>
          </div>

          {/* Mode switcher + Examples in one compact row */}
          <div className="mt-4 flex flex-wrap items-center gap-2"
          >
            <div
              className="flex flex-wrap gap-2 rounded-full border border-white/10 bg-black/25 p-1"
              role="group"
              aria-label="Query mode"
            >
              <button
                type="button"
                onClick={() => setMode("market-id")}
                className={`${btnBase} px-4 py-2 ${
                  mode === "market-id"
                    ? "bg-white text-slate-950 shadow-sm shadow-black/20"
                    : "text-slate-200 hover:bg-white/10"
                }`}
              >
                Use Market ID
              </button>
              <button
                type="button"
                onClick={() => setMode("custom")}
                className={`${btnBase} px-4 py-2 ${
                  mode === "custom"
                    ? "bg-white text-slate-950 shadow-sm shadow-black/20"
                    : "text-slate-200 hover:bg-white/10"
                }`}
              >
                Use Custom Market
              </button>
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Example presets">
              <button
                type="button"
                onClick={() => {
                  setMode("market-id");
                  setMarketId(EXAMPLE_MARKET_ID);
                }}
                className={`${btnBase} border border-white/15 bg-white/5 px-3 py-1.5 text-slate-200 hover:border-violet-400/40 hover:text-white`}
              >
                Example1
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("custom");
                  setMarketQuestion(EXAMPLE_MARKET_QUESTION);
                }}
                className={`${btnBase} border border-white/15 bg-white/5 px-3 py-1.5 text-slate-200 hover:border-violet-400/40 hover:text-white`}
              >
                Example2
              </button>
            </div>
          </div>

          {/* Input area */}
          <div className="mt-4 flex min-h-0 flex-1 flex-col"
          >
            {mode === "market-id" ? (
              <label className="block text-sm text-slate-300"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400"
                >
                  Market ID
                </span>
                <input
                  aria-label="Market ID"
                  value={marketId}
                  onChange={(event) => setMarketId(event.target.value)}
                  className={inputGlowClass}
                />
              </label>
            ) : (
              <label className="flex min-h-0 flex-1 flex-col text-sm text-slate-300"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400"
                >
                  Market Question
                </span>
                <textarea
                  aria-label="Market Question"
                  value={marketQuestion}
                  onChange={(event) => setMarketQuestion(event.target.value)}
                  className={`${inputGlowClass} min-h-0 flex-1 resize-y`}
                />
                <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-500"
                >
                  Resolution hint · {shortenUrl(EXAMPLE_RESOLUTION_SOURCE)}
                </p>
              </label>
            )}
          </div>

          {/* Bottom action area */}
          <div className="mt-4 space-y-3"
          >
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
              title={!hasInput ? "Enter a market ID or question first" : undefined}
              className={`w-full rounded-full bg-gradient-to-r from-sky-400 to-violet-500 px-5 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_14px_48px_rgba(56,189,248,0.35),0_0_40px_rgba(139,92,246,0.2)] transition duration-200 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100 sm:w-auto ${btnBase}`}
            >
              {isLoading ? "Searching…" : "Find Sources"}
            </button>
          </div>
        </div>
      </PanelShell>

      {/* Right panel — Results */}
      <PanelShell
        energyBorder
        className="dashboard-panel h-full p-6 backdrop-blur-2xl sm:p-8"
      >
        <ResultsPanel hasSearched={hasSearched} isLoading={isLoading} response={response} />
      </PanelShell>
    </section>
  );
}
