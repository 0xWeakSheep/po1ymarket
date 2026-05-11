/**
 * Recommendation API — shared between the Query Console UI and the browser HTTP client.
 * Backend: POST /api/v1/recommendations → { recommended_sources, planning_meta? }
 */

export type QueryMode = "market-id" | "custom";

/** 与 Nest JSON 一致（snake_case），来自 `planning_meta`。 */
export type QueryPlanningMetaWire = {
  planner_configured: boolean
  query_source: "llm" | "rules"
  fallback_reason?: string
  upstream_http_status?: number
  upstream_code?: string
  message?: string
  debug_detail?: string
};

/** Form → request body mapping uses snake_case on the wire (Nest). */
export type RecommendationsQueryInput = {
  mode: QueryMode;
  marketId?: string;
  marketQuestion?: string;
};

/** One row in the results list (UI + mapped from API). */
export type RecommendedSourceRow = {
  url: string;
  domain: string;
  label: string;
  reason: string;
  score: number;
};

export type RecommendationsRunState =
  | {
      state: "success";
      results: RecommendedSourceRow[];
      planning_meta?: QueryPlanningMetaWire;
    }
  | { state: "no-results"; results: []; planning_meta?: QueryPlanningMetaWire }
  | { state: "error"; results: []; errorMessage: string };

export type RecommendationApiJsonResponse = {
  recommended_sources: Array<{ url: string; score: number }>;
  planning_meta?: QueryPlanningMetaWire;
};
