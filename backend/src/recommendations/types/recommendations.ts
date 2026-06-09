export type SourceType = 'news' | 'social' | 'official'

export type MarketInputType =
  | 'polymarket_market_id'
  | 'polymarket_market_slug'
  | 'polymarket_event_slug'
  | 'legacy_market_id'
  | 'market_question'

export type MarketMeta = {
  input_type: MarketInputType
  resolved_from_polymarket: boolean
  fallback_used?: boolean
}

export type QueryMeta = {
  query_count: number
  primary_query: string
  variants: string[]
}

export type RecommendationRequest = {
  /** Legacy alias for Polymarket Gamma market id. Prefer `polymarket_market_id`. */
  market_id?: string
  /** Explicit Polymarket Gamma market id (`GET /markets/{id}`). */
  polymarket_market_id?: string
  /** Explicit Polymarket market slug (`GET /markets/slug/{slug}`). */
  polymarket_market_slug?: string
  /** Explicit Polymarket event slug (`GET /events/slug/{slug}`). */
  polymarket_event_slug?: string
  market_question?: string
  market_description?: string
  resolution_source?: string
  max_results?: number
  candidate_limit?: number
  include_rejected?: boolean
}

/** 与 Nest 响应 JSON 一致：snake_case。供前端区分 LLM / 规则与排障（不含密钥）。 */
export type QueryPlanningFallbackReason =
  | 'planner_disabled'
  | 'llm_empty_content'
  | 'llm_request_failed'
  | 'payload_parse_failed'
  | 'queries_sanitized_insufficient'

export type QueryPlanningMeta = {
  planner_configured: boolean
  query_source: 'llm' | 'rules'
  fallback_reason?: QueryPlanningFallbackReason
  upstream_http_status?: number
  upstream_code?: string
  /** 简短可读说明（不脱敏密钥） */
  message?: string
  /** 服务端 PO1MARKET_QUERY_DEBUG=true 时才返回，便于前端与日志对照 */
  debug_detail?: string
}

export type MarketContext = {
  marketId?: string
  marketSlug?: string
  eventSlug?: string
  question: string
  description?: string
  resolutionSource?: string
  endDate?: Date
  searchQueries: string[]
  planning_meta?: QueryPlanningMeta
  market_meta?: MarketMeta
  query_meta?: QueryMeta
}

export type CandidateSource = {
  title: string
  url: string
  snippet?: string
  sourceType: SourceType
  provider: string
  publishedAt?: Date
  relevanceScore?: number
  freshnessScore?: number
  aiScore?: number
  totalScore?: number
  stale?: boolean
  staleReason?: string
  rationale?: string
}

export type RetrievalProviderDebug = {
  provider: string
  query_count: number
  candidate_count: number
  failed_query_count: number
  failure_reasons?: string[]
}

export type RetrievalMeta = {
  strategy: 'fixed_provider_mix'
  candidate_limit: number
  query_count: number
  providers: RetrievalProviderDebug[]
  total_candidates_before_scoring: number
  total_candidates_after_scoring?: number
  stale_filtered_count?: number
}

export type CandidateScoreDebug = {
  relevance_score: number
  freshness_score: number
  ai_score: number
  total_score: number
  stale: boolean
  stale_reason?: string
}

export type RecommendedSource = {
  url: string
  score: number
  title?: string
  provider?: string
  source_type?: SourceType
  rationale?: string
  debug_score?: CandidateScoreDebug
}

export type ScoringMeta = {
  scored_count: number
  returned_count: number
  stale_filtered_count: number
  llm_rerank_enabled: boolean
}

export type RecommendationResponse = {
  recommended_sources: RecommendedSource[]
  market_meta?: MarketMeta
  planning_meta?: QueryPlanningMeta
  query_meta?: QueryMeta
  retrieval_meta?: RetrievalMeta
  scoring_meta?: ScoringMeta
}

export type QueryPreviewResponse = {
  question: string
  description?: string
  resolutionSource?: string
  searchQueries: string[]
  planning_meta?: QueryPlanningMeta
  market_meta?: MarketMeta
  query_meta?: QueryMeta
}

export type QueryPlanPayload = {
  primary_query: string
  variants?: string[]
  confidence?: number
}

/** Planner 单次 HTTP 调用结果（不含「未启用」语义，由 QueryService 处理）。 */
export type QueryPlanningCallResult =
  | { ok: true; outputText: string }
  | { ok: false; reason: 'empty_content' }
  | {
    ok: false
    reason: 'request_failed'
    httpStatus?: number
    code?: string
    /** 对用户/前端展示的短句（不含密钥） */
    safeSummary: string
    debugDetail?: string
  }

export type QueryPlanningClientPort = {
  enabled: boolean
  planQueries: (input: {
    question: string
    description?: string
    resolutionSource?: string
  }) => Promise<QueryPlanningCallResult>
}

export type RecommendationService = {
  recommend: (request: RecommendationRequest) => Promise<RecommendationResponse>
}

export type LlmScoreResult = {
  relevance_score?: number
  freshness_score?: number
  ai_score?: number
  rationale?: string
}

export type LlmClient = {
  enabled: boolean
  scoreCandidate: (input: {
    marketQuestion: string
    marketDescription?: string
    candidateTitle: string
    candidateSnippet?: string
    publishedAt?: string
    sourceType: SourceType
  }) => Promise<LlmScoreResult | null>
}
