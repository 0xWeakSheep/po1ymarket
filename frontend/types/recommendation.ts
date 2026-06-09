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

export type SourceTypeWire = "news" | "social" | "official";

export type MarketMetaWire = {
  input_type:
    | "polymarket_market_id"
    | "polymarket_market_slug"
    | "polymarket_event_slug"
    | "legacy_market_id"
    | "market_question";
  resolved_from_polymarket: boolean;
  fallback_used?: boolean;
};

export type QueryMetaWire = {
  query_count: number;
  primary_query: string;
  variants: string[];
};

export type RetrievalMetaWire = {
  strategy: "fixed_provider_mix";
  candidate_limit: number;
  query_count: number;
  providers: Array<{
    provider: string;
    query_count: number;
    candidate_count: number;
    failed_query_count: number;
    failure_reasons?: string[];
  }>;
  total_candidates_before_scoring: number;
  total_candidates_after_scoring?: number;
  stale_filtered_count?: number;
};

export type ScoringMetaWire = {
  scored_count: number;
  returned_count: number;
  stale_filtered_count: number;
  llm_rerank_enabled: boolean;
};

export type CandidateScoreDebugWire = {
  relevance_score: number;
  freshness_score: number;
  ai_score: number;
  total_score: number;
  stale: boolean;
  stale_reason?: string;
};

/** Form → request body mapping uses snake_case on the wire (Nest). */
export type RecommendationsQueryInput = {
  mode: QueryMode;
  marketId?: string;
  marketSlug?: string;
  eventSlug?: string;
  marketQuestion?: string;
};

/** One row in the results list (UI + mapped from API). */
export type RecommendedSourceRow = {
  url: string;
  domain: string;
  label: string;
  reason: string;
  score: number;
  provider?: string;
  sourceType?: SourceTypeWire;
};

export type RecommendationsRunState =
  | {
      state: "success";
      results: RecommendedSourceRow[];
      planning_meta?: QueryPlanningMetaWire;
      market_meta?: MarketMetaWire;
      query_meta?: QueryMetaWire;
      retrieval_meta?: RetrievalMetaWire;
      scoring_meta?: ScoringMetaWire;
    }
  | {
      state: "no-results";
      results: [];
      planning_meta?: QueryPlanningMetaWire;
      market_meta?: MarketMetaWire;
      query_meta?: QueryMetaWire;
      retrieval_meta?: RetrievalMetaWire;
      scoring_meta?: ScoringMetaWire;
    }
  | { state: "error"; results: []; errorMessage: string };

export type RecommendationApiJsonResponse = {
  recommended_sources: Array<{
    url: string;
    score: number;
    title?: string;
    provider?: string;
    source_type?: SourceTypeWire;
    rationale?: string;
    debug_score?: CandidateScoreDebugWire;
  }>;
  market_meta?: MarketMetaWire;
  planning_meta?: QueryPlanningMetaWire;
  query_meta?: QueryMetaWire;
  retrieval_meta?: RetrievalMetaWire;
  scoring_meta?: ScoringMetaWire;
};
