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
    if (!input.marketId?.trim()) {
      return { state: "error", results: [], errorMessage: "请填写市场 ID。" };
    }
    body.market_id = input.marketId.trim();
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
    const planningMeta = data.planning_meta;
    const sources = data.recommended_sources ?? [];
    if (!sources.length) {
      return { state: "no-results", results: [], planning_meta: planningMeta };
    }

    const results: RecommendedSourceRow[] = sources.map((s) => {
      const host = publicHostname(s.url);
      return {
        url: s.url,
        domain: host,
        label: host,
        reason: "由推荐接口返回。",
        score: typeof s.score === "number" ? s.score : 0,
      };
    });

    return { state: "success", results, planning_meta: planningMeta };
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
