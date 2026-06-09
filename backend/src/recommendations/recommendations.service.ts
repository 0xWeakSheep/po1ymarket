/**
 * 推荐服务
 * 
 * 功能：
 * 1. 标准化请求
 * 2. 解析市场上下文
 * 3. 收集候选源
 * 4. 打分
 * 5. 返回推荐链接列表
 */
import { Inject, Injectable, Logger } from '@nestjs/common'

import { SETTINGS } from '../common/constants'
import type { Settings } from '../config/settings'
import { normalizeRequest } from './application/normalize-request'
import { RetrievalService } from './retrieval/domain/retrieval.service'
import { ScoringService } from './scoring.service'
import {
  type CandidateSource,
  type RecommendedSource,
  type RecommendationRequest,
  type RecommendationResponse
} from './types/recommendations'

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name)

  constructor (
    @Inject(SETTINGS) private readonly settings: Settings,
    private readonly retrievalService: RetrievalService,
    private readonly scoringService: ScoringService
  ) {}

  async recommend (request: RecommendationRequest): Promise<RecommendationResponse> {
    //标准化请求
    const normalizedRequest = normalizeRequest(request, this.settings)

    const retrievalResult = await this.retrievalService.retrieve({
      request: normalizedRequest,
      candidateLimit: normalizedRequest.candidate_limit ?? this.settings.marketCandidateLimit
    })

    const scoredCandidates = await this.scoringService.scoreCandidates(
      retrievalResult.market,
      retrievalResult.candidates
    )
    const includeDebugScore = this.settings.queryDebugEnabled
    const staleFilteredCount = scoredCandidates.filter((candidate) => candidate.stale).length
    const recommended = scoredCandidates
      .filter((candidate) => !candidate.stale)
      .slice(0, normalizedRequest.max_results ?? this.settings.marketDefaultLimit)
    const recommendedSources = recommended.map((candidate) =>
      toRecommendedSource(candidate, includeDebugScore)
    )
    const retrievalMeta = {
      ...retrievalResult.retrievalMeta,
      total_candidates_after_scoring: recommended.length,
      stale_filtered_count: staleFilteredCount
    }

    this.logger.log(JSON.stringify({
      event: 'recommendation_retrieval_summary',
      query_source: retrievalResult.market.planning_meta?.query_source,
      query_count: retrievalMeta.query_count,
      providers: retrievalMeta.providers,
      total_candidates_before_scoring: retrievalMeta.total_candidates_before_scoring,
      total_candidates_after_scoring: retrievalMeta.total_candidates_after_scoring,
      stale_filtered_count: retrievalMeta.stale_filtered_count
    }))

    return {
      recommended_sources: recommendedSources,
      market_meta: retrievalResult.market.market_meta,
      planning_meta: retrievalResult.market.planning_meta,
      query_meta: retrievalResult.market.query_meta,
      retrieval_meta: retrievalMeta,
      scoring_meta: {
        scored_count: scoredCandidates.length,
        returned_count: recommendedSources.length,
        stale_filtered_count: staleFilteredCount,
        llm_rerank_enabled: this.settings.llmRerankEnabled
      }
    }
  }
}

function roundScore (value: number | undefined): number {
  return Number((value ?? 0).toFixed(4))
}

function toRecommendedSource (candidate: CandidateSource, includeDebug: boolean): RecommendedSource {
  return {
    url: candidate.url,
    score: roundScore(candidate.totalScore),
    title: candidate.title,
    provider: candidate.provider,
    source_type: candidate.sourceType,
    rationale: candidate.rationale,
    ...(includeDebug
      ? {
          debug_score: {
            relevance_score: roundScore(candidate.relevanceScore),
            freshness_score: roundScore(candidate.freshnessScore),
            ai_score: roundScore(candidate.aiScore),
            total_score: roundScore(candidate.totalScore),
            stale: Boolean(candidate.stale),
            stale_reason: candidate.staleReason
          }
        }
      : {})
  }
}
