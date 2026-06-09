import { Injectable } from '@nestjs/common'

import { RequestCacheService } from '../cache/request-cache.service'
import { QueryServiceClient } from '../query/query-service.client'
import type {
  QueryPreviewResponse,
  RecommendationRequest
} from '../../recommendations/types/recommendations'

@Injectable()
export class InfraQueryService {
  constructor (
    private readonly queryServiceClient: QueryServiceClient,
    private readonly requestCacheService: RequestCacheService
  ) {}

  async resolveQueries (
    request: RecommendationRequest
  ): Promise<QueryPreviewResponse> {
    const cached =
      await this.requestCacheService.get<QueryPreviewResponse>('queries', request)
    if (cached) {
      return cached
    }

    const response = await this.queryServiceClient.fetchQueries(request)
    await this.requestCacheService.put('queries', request, response)
    return response
  }
}
