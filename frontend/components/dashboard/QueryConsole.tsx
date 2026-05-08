"use client";

import { useId, useState } from "react";

import {
  isRecommendationsApiConfigured,
  runRecommendationsQuery,
} from "@/api/recommendations";
import { PixelLabel } from "@/components/ui/PixelLabel";
import {
  EXAMPLE_MARKET_ID,
  EXAMPLE_MARKET_QUESTION,
  EXAMPLE_RESOLUTION_SOURCE,
} from "@/constants/examples";
import type { QueryMode, RecommendationsRunState } from "@/types/recommendation";
import { formatScore, shortenUrl } from "@/utils/display";

const INITIAL_RESPONSE: RecommendationsRunState = {
  state: "no-results",
  results: [],
};

const consoleSurfaceClass =
  "relative flex h-full min-h-[28rem] flex-col rounded-[28px] border border-violet-400/30 bg-white/[0.07] p-6 shadow-[0_0_120px_-28px_rgba(139,92,246,0.5),0_32px_100px_rgba(2,6,23,0.6)] backdrop-blur-2xl ring-1 ring-white/10 sm:min-h-[32rem] sm:p-8";

const inputGlowClass =
  "mt-2 w-full rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-white outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-slate-600 focus-visible:border-violet-400/55 focus-visible:shadow-[0_0_36px_rgba(139,92,246,0.28)] focus-visible:ring-2 focus-visible:ring-violet-500/30";

const btnBase =
  "cursor-pointer rounded-full text-xs font-medium transition-colors duration-200 sm:text-sm";

export function QueryConsole() {
  const regionId = useId();
  const [mode, setMode] = useState<QueryMode>("market-id");
  const [marketId, setMarketId] = useState("");
  const [marketQuestion, setMarketQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<RecommendationsRunState>(INITIAL_RESPONSE);
  const [hasSearched, setHasSearched] = useState(false);

  const apiReady = isRecommendationsApiConfigured();
  const hasInput =
    mode === "market-id" ? Boolean(marketId.trim()) : Boolean(marketQuestion.trim());
  const canSubmit = apiReady && hasInput && !isLoading;

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
      className={consoleSurfaceClass}
      aria-labelledby={`${regionId}-title`}
      onKeyDown={onFormKeyDown}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(120%_80%_at_50%_-20%,rgba(139,92,246,0.14),transparent_55%)]" />
      <div
        className="relative z-10 flex h-full flex-col"
        role="region"
        aria-busy={isLoading}
        aria-live="polite"
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <PixelLabel>
            <span id={`${regionId}-title`}>Query Console</span>
          </PixelLabel>
          <PixelLabel>
            {apiReady ? "API ready" : "API not configured"} ·{" "}
            {mode === "market-id" ? "ID mode" : "Custom mode"}
          </PixelLabel>
        </div>

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

        <div className="mt-5 flex min-h-0 flex-1 flex-col space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Example presets">
            <button
              type="button"
              onClick={() => {
                setMode("market-id");
                setMarketId(EXAMPLE_MARKET_ID);
              }}
              className={`${btnBase} border border-white/15 bg-white/5 px-3 py-1.5 text-slate-200 hover:border-violet-400/40 hover:text-white`}
            >
              Example Market ID
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("custom");
                setMarketQuestion(EXAMPLE_MARKET_QUESTION);
              }}
              className={`${btnBase} border border-white/15 bg-white/5 px-3 py-1.5 text-slate-200 hover:border-violet-400/40 hover:text-white`}
            >
              Example Custom Market
            </button>
          </div>

          {mode === "market-id" ? (
            <label className="block text-sm text-slate-300">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
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
            <label className="block min-h-0 flex-1 text-sm text-slate-300">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Market Question
              </span>
              <textarea
                aria-label="Market Question"
                rows={5}
                value={marketQuestion}
                onChange={(event) => setMarketQuestion(event.target.value)}
                className={`${inputGlowClass} min-h-[7.5rem] resize-y`}
              />
              <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Resolution hint · {shortenUrl(EXAMPLE_RESOLUTION_SOURCE)}
              </p>
            </label>
          )}

          {!apiReady ? (
            <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100/90">
              Set{" "}
              <span className="font-mono text-xs">NEXT_PUBLIC_API_BASE_URL</span> in{" "}
              <span className="font-mono text-xs">frontend/.env.local</span> (see{" "}
              <span className="font-mono text-xs">.env.example</span>) so the console can call the
              recommendation API.
            </p>
          ) : null}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            title={
              !apiReady
                ? "Configure NEXT_PUBLIC_API_BASE_URL first"
                : !hasInput
                  ? "Enter a market ID or question first"
                  : undefined
            }
            className={`w-full rounded-full bg-gradient-to-r from-sky-400 to-violet-500 px-5 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_14px_48px_rgba(56,189,248,0.35),0_0_40px_rgba(139,92,246,0.2)] transition duration-200 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100 sm:w-auto ${btnBase}`}
          >
            {isLoading ? "Searching…" : "Find Sources"}
          </button>
        </div>

        <div
          className="relative z-10 mt-6 min-h-[5rem] rounded-2xl border border-white/10 bg-black/30 p-4"
          aria-label="Results"
        >
          {!hasSearched ? (
            <p className="text-sm text-slate-400">
              Run a market query to preview recommended sources.
            </p>
          ) : isLoading ? (
            <p className="text-sm text-slate-400">Searching…</p>
          ) : response.state === "error" ? (
            <p className="text-sm text-rose-300">{response.errorMessage ?? "Something went wrong."}</p>
          ) : response.state === "no-results" ? (
            <p className="text-sm text-slate-400">No sources found. Try a richer query.</p>
          ) : (
            <div className="space-y-3">
              {response.results.map((item) => (
                <article
                  key={item.url}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-4 transition-colors duration-200 hover:border-violet-400/25"
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
        </div>
      </div>
    </section>
  );
}
