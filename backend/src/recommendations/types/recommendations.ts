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

export type MarketContext = {
  marketId?: string
  question: string
  description?: string
  resolutionSource?: string
  endDate?: Date
  searchQueries: string[]
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
}

export type QueryPreviewResponse = {
  question: string
  description?: string
  resolutionSource?: string
  searchQueries: string[]
}

export type QueryPlanPayload = {
  primary_query: string
  variants?: string[]
  intent_tags?: string[]
  entities?: string[]
  time_constraints?: string[]
  confidence?: number
}

export type QueryPlanningResult = {
  outputText: string
}

export type QueryPlanningClientPort = {
  enabled: boolean
  planQueries: (input: {
    question: string
    description?: string
    resolutionSource?: string
  }) => Promise<QueryPlanningResult | null>
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
