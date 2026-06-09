import { getRecommendationsApiBaseUrl } from "@/config/recommendation";
import type {
  RecommendationApiJsonResponse,
  RecommendationsQueryInput,
  RecommendationsRunState,
  RecommendedSourceRow,
} from "@/types/recommendation";
import { publicHostname } from "@/utils/display";
import {
  formatRecommendationsHttpError,
  formatRecommendationsNetworkError,
} from "@/utils/recommendationErrors";

export { getRecommendationsApiBaseUrl, DEFAULT_RECOMMENDATIONS_API_BASE_URL } from "@/config/recommendation";

/**
 * POST recommendation resource on the Nest API.
 *
 * @param baseUrl — Prefix only (see `config/recommendation.ts`): default pattern is `/po1ymarket`;
 *   request URL is always `${baseUrl}/api/v1/recommendations`.
 */
export async function fetchRecommendations(
  input: RecommendationsQueryInput,
  baseUrl: string,
): Promise<RecommendationsRunState> {
  const body: Record<string, string> = {};
  if (input.mode === "market-id") {
    const marketId = input.marketId?.trim();
    const marketSlug = input.marketSlug?.trim();
    const eventSlug = input.eventSlug?.trim();
    if (!marketId && !marketSlug && !eventSlug) {
      return {
        state: "error",
        results: [],
        errorMessage: "请至少填写 Polymarket 市场 ID、market slug 或 event slug 之一。",
      };
    }
    if (marketId) body.polymarket_market_id = marketId;
    if (marketSlug) body.polymarket_market_slug = marketSlug;
    if (eventSlug) body.polymarket_event_slug = eventSlug;
  } else {
    if (!input.marketQuestion?.trim()) {
      return { state: "error", results: [], errorMessage: "请填写市场问题描述。" };
    }
    body.market_question = input.marketQuestion.trim();
  }

  try {
    const res = await fetch(`${baseUrl}/api/v1/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let serverMessage = `API 错误（${res.status}）`;
      try {
        const errJson = (await res.json()) as { message?: string | string[] };
        if (typeof errJson.message === "string") {
          serverMessage = errJson.message;
        } else if (Array.isArray(errJson.message)) {
          serverMessage = errJson.message.join("；");
        }
      } catch {
        /* keep default */
      }
      const errorMessage = formatRecommendationsHttpError(res.status, baseUrl, serverMessage);
      return { state: "error", results: [], errorMessage };
    }

    const data = (await res.json()) as RecommendationApiJsonResponse;
    const commonMeta = {
      planning_meta: data.planning_meta,
      market_meta: data.market_meta,
      query_meta: data.query_meta,
      retrieval_meta: data.retrieval_meta,
      scoring_meta: data.scoring_meta,
    };
    const sources = data.recommended_sources ?? [];
    if (!sources.length) {
      return { state: "no-results", results: [], ...commonMeta };
    }

    const results: RecommendedSourceRow[] = sources.map((s) => {
      const host = publicHostname(s.url);
      const providerLabel = s.provider?.trim() || "推荐接口";
      return {
        url: s.url,
        domain: host,
        label: s.title?.trim() || host,
        reason: s.rationale?.trim() || `由 ${providerLabel} 返回。`,
        score: typeof s.score === "number" ? s.score : 0,
        provider: s.provider,
        sourceType: s.source_type,
      };
    });

    return { state: "success", results, ...commonMeta };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return {
      state: "error",
      results: [],
      errorMessage: formatRecommendationsNetworkError(baseUrl, message),
    };
  }
}

/** Uses `getRecommendationsApiBaseUrl()` so the console follows the proxy-by-default setup. */
export async function runRecommendationsQuery(
  input: RecommendationsQueryInput,
): Promise<RecommendationsRunState> {
  return fetchRecommendations(input, getRecommendationsApiBaseUrl());
}
