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
    const recommended = scoredCandidates
      .filter((candidate) => !candidate.stale)
      .slice(0, normalizedRequest.max_results ?? this.settings.marketDefaultLimit)
    const staleFilteredCount = scoredCandidates.filter((candidate) => candidate.stale).length
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
      recommended_sources: recommended.map((candidate) => ({
        url: candidate.url,
        score: 0
      })),
      planning_meta: retrievalResult.market.planning_meta,
      retrieval_meta: retrievalMeta
    }
  }
}
