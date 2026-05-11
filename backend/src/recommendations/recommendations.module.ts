import { Module } from '@nestjs/common'

import { SETTINGS } from '../common/constants'
import { getSettings } from '../config/settings'
import { OpenAiClient } from './clients/openai.client'
import { PolymarketClient } from './clients/polymarket.client'
import { QueryController } from './query/api/query.controller'
import { QueryService } from './query/domain/query.service'
import { QueryMarketProvider } from './query/integration/query-market.provider'
import { QueryPlanningClient } from './query/integration/query-planning.client'
import { CandidateRetrieverService } from './retrieval/domain/candidate-retriever.service'
import { RetrievalService } from './retrieval/domain/retrieval.service'
import { SearchClient } from './retrieval/integration/search.client'
import { RecommendationsController } from './recommendations.controller'
import { RecommendationsService } from './recommendations.service'
import { ScoringService } from './scoring.service'

@Module({
  controllers: [RecommendationsController, QueryController],
  providers: [
    { provide: SETTINGS, useFactory: getSettings },
    PolymarketClient,
    SearchClient,
    OpenAiClient,
    QueryMarketProvider,
    QueryPlanningClient,
    QueryService,
    CandidateRetrieverService,
    RetrievalService,
    ScoringService,
    RecommendationsService
  ]
})
export class RecommendationsModule {}
