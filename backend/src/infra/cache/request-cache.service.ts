import { Inject, Injectable } from '@nestjs/common'

import { SETTINGS } from '../../common/constants'
import type { Settings } from '../../config/settings'
import type { RecommendationRequest } from '../../recommendations/types/recommendations'
import { buildCacheKey, type CacheScope } from './cache-key'
import { RequestCacheRepository } from './request-cache.repository'

@Injectable()
export class RequestCacheService {
  constructor (
    @Inject(SETTINGS) private readonly settings: Settings,
    private readonly repository: RequestCacheRepository
  ) {}

  async get<T> (scope: CacheScope, request: RecommendationRequest): Promise<T | null> {
    return await this.repository.getFresh<T>(scope, buildCacheKey(scope, request))
  }

  async put (
    scope: CacheScope,
    request: RecommendationRequest,
    response: unknown
  ): Promise<void> {
    await this.repository.save(
      scope,
      buildCacheKey(scope, request),
      request as Record<string, unknown>,
      response,
      this.settings.queryCacheTtlSeconds
    )
  }
}
