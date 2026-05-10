import { getRecommendationsApiBaseUrl } from "@/config/recommendation";
import type {
  RecommendationApiJsonResponse,
  RecommendationsQueryInput,
  RecommendationsRunState,
  RecommendedSourceRow,
} from "@/types/recommendation";
import { publicHostname } from "@/utils/display";

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
      return { state: "error", results: [], errorMessage: "Market ID is required." };
    }
    body.market_id = input.marketId.trim();
  } else {
    if (!input.marketQuestion?.trim()) {
      return { state: "error", results: [], errorMessage: "Market question is required." };
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
      let errorMessage = `API error (${res.status})`;
      try {
        const errJson = (await res.json()) as { message?: string | string[] };
        if (typeof errJson.message === "string") {
          errorMessage = errJson.message;
        } else if (Array.isArray(errJson.message)) {
          errorMessage = errJson.message.join("; ");
        }
      } catch {
        /* keep default */
      }
      return { state: "error", results: [], errorMessage };
    }

    const data = (await res.json()) as RecommendationApiJsonResponse;
    const sources = data.recommended_sources ?? [];
    if (!sources.length) {
      return { state: "no-results", results: [] };
    }

    const results: RecommendedSourceRow[] = sources.map((s) => {
      const host = publicHostname(s.url);
      return {
        url: s.url,
        domain: host,
        label: host,
        reason: "Returned by recommendation API.",
        score: typeof s.score === "number" ? s.score : 0,
      };
    });

    return { state: "success", results };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { state: "error", results: [], errorMessage: message };
  }
}

/** Uses `getRecommendationsApiBaseUrl()` so the console follows the proxy-by-default setup. */
export async function runRecommendationsQuery(
  input: RecommendationsQueryInput,
): Promise<RecommendationsRunState> {
  return fetchRecommendations(input, getRecommendationsApiBaseUrl());
}
