"use client";

import { useId, useState } from "react";

import { runRecommendationsQuery } from "@/api/recommendations";
import {
  EXAMPLE_EVENT_SLUG,
  EXAMPLE_MARKET_ID,
  EXAMPLE_MARKET_SLUG,
  EXAMPLE_MARKET_QUESTION,
  EXAMPLE_RESOLUTION_SOURCE,
} from "@/constants/examples";
import { describeQuerySource, formatFallbackReasonLabel } from "@/constants/planningMeta";
import type { QueryMode, QueryPlanningMetaWire, RecommendationsRunState } from "@/types/recommendation";
import { formatScore, shortenUrl } from "@/utils/display";

const INITIAL_RESPONSE: RecommendationsRunState = {
  state: "no-results",
  results: [],
};

const inputGlowClass =
  "dashboard-input mt-2 w-full px-3 py-2";

const btnBase =
  "retro-button cursor-pointer text-xs sm:text-sm";

function PlanningMetaNote({ meta }: { meta: QueryPlanningMetaWire }) {
  const usedLlm = meta.query_source === "llm" && !meta.fallback_reason;
  const frameClass = usedLlm
    ? "border-emerald-500/35 bg-emerald-500/10"
    : meta.fallback_reason
      ? "border-amber-500/40 bg-amber-500/10"
      : "border-white/15 bg-white/[0.06]";

  return (
    <div
      className={`dashboard-note mb-4 px-3 py-2.5 text-left text-xs leading-relaxed ${frameClass}`}
      role="status"
    >
      <p className="font-bold">查询规划（Planner）</p>
      <ul className="mt-1.5 list-inside list-disc space-y-0.5">
        <li>已配置 Planner：{meta.planner_configured ? "是" : "否"}</li>
        <li>检索词来源：{describeQuerySource(meta)}</li>
        {meta.fallback_reason ? (
          <li>回退原因：{formatFallbackReasonLabel(meta.fallback_reason) ?? meta.fallback_reason}</li>
        ) : null}
        {meta.upstream_http_status != null ? (
          <li>
            上游 HTTP：{meta.upstream_http_status}
            {meta.upstream_code ? `（${meta.upstream_code}）` : ""}
          </li>
        ) : null}
        {meta.message ? <li>{meta.message}</li> : null}
      </ul>
      {meta.debug_detail ? (
        <pre className="dashboard-debug mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all p-2 font-mono text-[10px]">
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
    <div className="flex flex-col h-full" aria-label="输出" role="region" aria-live="polite">
      <span className="dashboard-label">输出</span>
      <div className="mt-4 flex-1 overflow-auto min-h-0">
        {!hasSearched ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-2 text-center">
            <p className="text-sm">
              在左侧填写 Polymarket 市场 ID、market slug、event slug，或直接填写自定义市场描述，点击「查找来源」即可预览推荐来源。
            </p>
            <p className="max-w-md text-xs leading-relaxed">
              联调 Nest：在 <span className="font-mono">frontend/.env.local</span>{" "}
              配置 <span className="font-mono">BACKEND_PROXY_TARGET</span>{" "}
              指向后端（如 <span className="font-mono">http://127.0.0.1:3001</span>
              ）后重启 <span className="font-mono">npm run dev</span>
              ；亦可设置 <span className="font-mono">NEXT_PUBLIC_API_BASE_URL</span>{" "}
              直连。详见仓库内 <span className="font-mono">frontend/README.md</span>。
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="dashboard-loading" aria-hidden="true" />
            <p className="mt-3 text-sm">正在检索…</p>
          </div>
        ) : response.state === "error" ? (
          <pre className="dashboard-error whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
            {response.errorMessage ?? "发生未知错误。"}
          </pre>
        ) : (
          <>
            {response.planning_meta ? <PlanningMetaNote meta={response.planning_meta} /> : null}
            {response.state === "no-results" ? (
              <p className="text-sm">暂无候选来源，可尝试更具体的市场描述或更换示例。</p>
            ) : (
              <div className="space-y-3">
                {response.results.map((item) => (
                  <article
                    key={item.url}
                    className="result-card dashboard-result p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-bold">{item.label}</h3>
                      <span className="dashboard-score px-3 py-1 font-mono text-[11px]">
                        {formatScore(item.score)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{item.reason}</p>
                    <a
                      className="mt-3 inline-block cursor-pointer text-sm"
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
  const [marketSlug, setMarketSlug] = useState("");
  const [eventSlug, setEventSlug] = useState("");
  const [marketQuestion, setMarketQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<RecommendationsRunState>(INITIAL_RESPONSE);
  const [hasSearched, setHasSearched] = useState(false);

  const hasInput =
    mode === "market-id"
      ? Boolean(marketId.trim() || marketSlug.trim() || eventSlug.trim())
      : Boolean(marketQuestion.trim());
  const canSubmit = hasInput && !isLoading;

  async function handleSubmit() {
    if (!hasInput || isLoading) return;
    setIsLoading(true);
    setHasSearched(true);

    const next =
      mode === "market-id"
        ? await runRecommendationsQuery({ mode, marketId, marketSlug, eventSlug })
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
      className="retro-console-grid"
      aria-labelledby={`${regionId}-title`}
      onKeyDown={onFormKeyDown}
    >
      <section className="retro-window dashboard-panel h-full">
        <div className="retro-titlebar">
          <span>QUERY.EXE</span>
          <span aria-hidden="true" className="retro-window-controls">
            <span />
            <span />
            <span />
          </span>
        </div>
        <div className="retro-window-body dashboard-window-body">
          <div className="flex h-full flex-col">
            <div className="mb-5 flex flex-wrap items-center justify-start gap-3">
              <span className="dashboard-label" id={`${regionId}-title`}>
                查询工作台
              </span>
            </div>

          {/* Mode switcher + Examples in one compact row */}
          <div className="mt-4 flex flex-wrap items-center gap-2"
          >
            <div
              className="dashboard-button-group"
              role="group"
              aria-label="查询模式"
            >
              <button
                type="button"
                onClick={() => setMode("market-id")}
                className={`${btnBase} px-4 py-2 ${
                  mode === "market-id"
                    ? "retro-button-primary"
                    : ""
                }`}
              >
                使用 Polymarket 标识
              </button>
              <button
                type="button"
                onClick={() => setMode("custom")}
                className={`${btnBase} px-4 py-2 ${
                  mode === "custom"
                    ? "retro-button-primary"
                    : ""
                }`}
              >
                使用自定义市场
              </button>
            </div>

            <div className="dashboard-examples" role="group" aria-label="示例预设">
              <button
                type="button"
                onClick={() => {
                  setMode("market-id");
                  setMarketId(EXAMPLE_MARKET_ID);
                  setMarketSlug("");
                  setEventSlug("");
                }}
                className={`${btnBase} px-3 py-1.5`}
              >
                示例：市场 ID
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("market-id");
                  setMarketId("");
                  setMarketSlug(EXAMPLE_MARKET_SLUG);
                  setEventSlug("");
                }}
                className={`${btnBase} px-3 py-1.5`}
              >
                示例：market slug
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("market-id");
                  setMarketId("");
                  setMarketSlug("");
                  setEventSlug(EXAMPLE_EVENT_SLUG);
                }}
                className={`${btnBase} px-3 py-1.5`}
              >
                示例：event slug
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("custom");
                  setMarketQuestion(EXAMPLE_MARKET_QUESTION);
                }}
                className={`${btnBase} px-3 py-1.5`}
              >
                示例：自定义市场
              </button>
            </div>
          </div>

          {/* Input area */}
          <div className="mt-4 flex min-h-0 flex-1 flex-col"
          >
            {mode === "market-id" ? (
              <div className="space-y-4">
                <label className="block text-sm">
                  <span className="dashboard-field-label">
                    Polymarket 市场 ID
                  </span>
                  <input
                    aria-label="Polymarket 市场 ID"
                    value={marketId}
                    onChange={(event) => setMarketId(event.target.value)}
                    className={inputGlowClass}
                    placeholder="Gamma /markets/{id}，例如：540816"
                  />
                </label>
                <label className="block text-sm">
                  <span className="dashboard-field-label">
                    market slug
                  </span>
                  <input
                    aria-label="market slug"
                    value={marketSlug}
                    onChange={(event) => setMarketSlug(event.target.value)}
                    className={inputGlowClass}
                    placeholder="单个市场 slug，例如：fed-decision-in-october-bps"
                  />
                </label>
                <label className="block text-sm">
                  <span className="dashboard-field-label">
                    event slug
                  </span>
                  <input
                    aria-label="event slug"
                    value={eventSlug}
                    onChange={(event) => setEventSlug(event.target.value)}
                    className={inputGlowClass}
                    placeholder="事件 slug，例如：fed-decision-in-october"
                  />
                </label>
                <p className="text-xs leading-relaxed">
                  `market id`、`market slug`、`event slug` 含义不同。若同时填写，后端优先级为
                  `market id` &gt; `market slug` &gt; `event slug`。
                </p>
              </div>
            ) : (
              <label className="flex min-h-0 flex-1 flex-col text-sm"
              >
                <span className="dashboard-field-label"
                >
                  市场问题
                </span>
                <textarea
                  aria-label="市场问题描述"
                  value={marketQuestion}
                  onChange={(event) => setMarketQuestion(event.target.value)}
                  className={`${inputGlowClass} min-h-0 flex-1 resize-y`}
                />
                <p className="mt-2 font-mono text-[11px] uppercase"
                >
                  裁决来源示例 · {shortenUrl(EXAMPLE_RESOLUTION_SOURCE)}
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
              title={!hasInput ? "请先填写 Polymarket 标识或市场问题" : undefined}
              className={`w-full px-5 py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto ${btnBase} retro-button-danger`}
            >
              {isLoading ? "正在检索…" : "查找来源"}
            </button>
          </div>
          </div>
        </div>
      </section>

      <section className="retro-window dashboard-panel h-full">
        <div className="retro-titlebar">
          <span>RESULTS.OUT</span>
          <span aria-hidden="true" className="retro-window-controls">
            <span />
            <span />
            <span />
          </span>
        </div>
        <div className="retro-window-body dashboard-window-body">
          <ResultsPanel hasSearched={hasSearched} isLoading={isLoading} response={response} />
        </div>
      </section>
    </section>
  );
}
