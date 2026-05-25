import { Injectable } from '@nestjs/common'

import { PolymarketClient } from '../../clients/polymarket.client'
import type {
  MarketContext,
  RecommendationRequest
} from '../../types/recommendations'

type QueryMarketInput = Omit<MarketContext, 'searchQueries'> & {
  question: string
}

@Injectable()
export class QueryMarketProvider {
  constructor (private readonly polymarketClient: PolymarketClient) {}

  async resolveQueryMarketInput (request: RecommendationRequest): Promise<QueryMarketInput> {
    const market = await this.resolvePolymarketContext(request)
    if (market) {
      return {
        marketId: market.marketId,
        marketSlug: market.marketSlug,
        eventSlug: market.eventSlug,
        question: request.market_question ?? market.question,
        description: request.market_description ?? market.description,
        resolutionSource: request.resolution_source ?? market.resolutionSource,
        endDate: market.endDate
      }
    }

    return {
      question: request.market_question ?? '',
      description: request.market_description,
      resolutionSource: request.resolution_source
    }
  }

  private async resolvePolymarketContext (
    request: RecommendationRequest
  ): Promise<MarketContext | null> {
    const explicitMarketId = request.polymarket_market_id?.trim()
    if (explicitMarketId) {
      return await this.polymarketClient.fetchMarketById(explicitMarketId)
    }

    const marketSlug = request.polymarket_market_slug?.trim()
    if (marketSlug) {
      return await this.polymarketClient.fetchMarketBySlug(marketSlug)
    }

    const eventSlug = request.polymarket_event_slug?.trim()
    if (eventSlug) {
      return await this.polymarketClient.fetchEventBySlug(eventSlug)
    }

    const legacyMarketId = request.market_id?.trim()
    if (legacyMarketId) {
      return await this.polymarketClient.fetchMarketById(legacyMarketId)
    }

    return null
  }
}
