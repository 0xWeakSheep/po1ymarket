import { Module } from '@nestjs/common'

import { SETTINGS } from '../common/constants'
import { getSettings } from '../config/settings'
import { RequestCacheRepository } from './cache/request-cache.repository'
import { RequestCacheService } from './cache/request-cache.service'
import { QueryServiceClient } from './query/query-service.client'
import { InfraRecommendationsController } from './recommendations/infra-recommendations.controller'
import { InfraRecommendationsService } from './recommendations/infra-recommendations.service'
import { InfraQueryController } from './search/infra-query.controller'
import { InfraQueryService } from './search/infra-query.service'

@Module({
  controllers: [InfraRecommendationsController, InfraQueryController],
  providers: [
    { provide: SETTINGS, useFactory: getSettings },
    RequestCacheRepository,
    RequestCacheService,
    QueryServiceClient,
    InfraRecommendationsService,
    InfraQueryService
  ]
})
export class InfraModule {}
