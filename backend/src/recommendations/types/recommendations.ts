export type SourceType = 'news' | 'social' | 'official'

export type RecommendationRequest = {
  market_id?: string
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
  question: string
  description?: string
  resolutionSource?: string
  endDate?: Date
  searchQueries: string[]
  planning_meta?: QueryPlanningMeta
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

export type RecommendedLink = {
  url: string
  score: number
}

export type RecommendationResponse = {
  recommended_sources: RecommendedLink[]
  planning_meta?: QueryPlanningMeta
}

export type QueryPreviewResponse = {
  question: string
  description?: string
  resolutionSource?: string
  searchQueries: string[]
  planning_meta?: QueryPlanningMeta
}

export type QueryPlanPayload = {
  primary_query: string
  variants?: string[]
  intent_tags?: string[]
  entities?: string[]
  time_constraints?: string[]
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
  }) => Promise<LlmScoreResult | null>
}
