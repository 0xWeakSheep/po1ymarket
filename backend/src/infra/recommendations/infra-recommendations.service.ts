import { Injectable } from '@nestjs/common'

import { RequestCacheService } from '../cache/request-cache.service'
import { QueryServiceClient } from '../query/query-service.client'
import type {
  RecommendationRequest,
  RecommendationResponse
} from '../../recommendations/types/recommendations'

@Injectable()
export class InfraRecommendationsService {
  constructor (
    private readonly queryServiceClient: QueryServiceClient,
    private readonly requestCacheService: RequestCacheService
  ) {}

  async recommend (
    request: RecommendationRequest
  ): Promise<RecommendationResponse> {
    const cached =
      await this.requestCacheService.get<RecommendationResponse>('recommendations', request)
    if (cached) {
      return cached
    }

    const response = await this.queryServiceClient.fetchRecommendations(request)
    await this.requestCacheService.put('recommendations', request, response)
    return response
  }
}
