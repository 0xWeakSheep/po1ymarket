import { Module } from '@nestjs/common'

import { HealthModule } from '../../health/health.module'
import { RecommendationsModule } from '../../recommendations/recommendations.module'

@Module({
  imports: [HealthModule, RecommendationsModule]
})
export class QueryAppModule {}
