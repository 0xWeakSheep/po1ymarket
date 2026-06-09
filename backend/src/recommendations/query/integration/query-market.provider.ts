import { Injectable } from '@nestjs/common'

import { PolymarketClient } from '../../clients/polymarket.client'
import type {
  MarketContext,
  MarketInputType,
  RecommendationRequest
} from '../../types/recommendations'

type QueryMarketInput = Omit<MarketContext, 'searchQueries'> & {
  question: string
}

function getMarketInputType (request: RecommendationRequest): MarketInputType {
  if (request.polymarket_market_id?.trim()) return 'polymarket_market_id'
  if (request.polymarket_market_slug?.trim()) return 'polymarket_market_slug'
  if (request.polymarket_event_slug?.trim()) return 'polymarket_event_slug'
  if (request.market_id?.trim()) return 'legacy_market_id'
  return 'market_question'
}

@Injectable()
export class QueryMarketProvider {
  constructor (private readonly polymarketClient: PolymarketClient) {}

  async resolveQueryMarketInput (request: RecommendationRequest): Promise<QueryMarketInput> {
    const inputType = getMarketInputType(request)
    const market = await this.resolvePolymarketContext(request)
    if (market) {
      return {
        marketId: market.marketId,
        marketSlug: market.marketSlug,
        eventSlug: market.eventSlug,
        question: request.market_question ?? market.question,
        description: request.market_description ?? market.description,
        resolutionSource: request.resolution_source ?? market.resolutionSource,
        endDate: market.endDate,
        market_meta: {
          input_type: inputType,
          resolved_from_polymarket: true,
          fallback_used: false
        }
      }
    }

    return {
      question: request.market_question ?? '',
      description: request.market_description,
      resolutionSource: request.resolution_source,
      market_meta: {
        input_type: inputType,
        resolved_from_polymarket: false,
        fallback_used: false
      }
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
