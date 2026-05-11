import { Injectable } from '@nestjs/common'

import { buildSearchQueries } from './query-builder'
import {
  parseQueryPlanPayload,
  sanitizePlannedQueries
} from './query-planning.schema'
import { QueryMarketProvider } from '../integration/query-market.provider'
import { QueryPlanningClient } from '../integration/query-planning.client'
import type {
  MarketContext,
  QueryPreviewResponse,
  RecommendationRequest
} from '../../types/recommendations'

@Injectable()
export class QueryService {
  constructor (
    private readonly queryMarketProvider: QueryMarketProvider,
    private readonly queryPlanningClient: QueryPlanningClient
  ) {}

  async buildQueries (input: {
    question: string
    description?: string
    resolutionSource?: string
  }): Promise<string[]> {
    const fallback = () => buildSearchQueries({
      question: input.question,
      description: input.description,
      resolutionSource: input.resolutionSource
    })

    if (!this.queryPlanningClient.enabled) {
      return fallback()
    }

    const planned = await this.queryPlanningClient.planQueries(input)
    if (!planned?.outputText) {
      return fallback()
    }

    try {
      const payload = parseQueryPlanPayload(planned.outputText)
      const queries = sanitizePlannedQueries(payload, 6)
      if (queries.length < 2) {
        return fallback()
      }
      return queries
    } catch {
      return fallback()
    }
  }

  async resolveQueries (request: RecommendationRequest): Promise<QueryPreviewResponse> {
    const queryMarketInput = await this.queryMarketProvider.resolveQueryMarketInput(request)

    return {
      question: queryMarketInput.question,
      description: queryMarketInput.description,
      resolutionSource: queryMarketInput.resolutionSource,
      searchQueries: await this.buildQueries(queryMarketInput)
    }
  }

  async resolveMarketContext (request: RecommendationRequest): Promise<MarketContext> {
    const queryMarketInput = await this.queryMarketProvider.resolveQueryMarketInput(request)

    return {
      marketId: queryMarketInput.marketId,
      question: queryMarketInput.question,
      description: queryMarketInput.description,
      resolutionSource: queryMarketInput.resolutionSource,
      endDate: queryMarketInput.endDate,
      searchQueries: await this.buildQueries(queryMarketInput)
    }
  }
}
