import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post
} from '@nestjs/common'

import type { RecommendationRequest } from '../../recommendations/types/recommendations'
import { InfraRecommendationsService } from './infra-recommendations.service'

@Controller('api/v1')
export class InfraRecommendationsController {
  constructor (
    private readonly infraRecommendationsService: InfraRecommendationsService
  ) {}

  @Post('recommendations')
  @HttpCode(HttpStatus.OK)
  async create (@Body() payload: RecommendationRequest) {
    if (!hasMarketSelector(payload)) {
      throw new BadRequestException(
        'Provide at least one of market_question, polymarket_market_id, polymarket_market_slug, polymarket_event_slug, or legacy market_id.'
      )
    }

    return await this.infraRecommendationsService.recommend(payload)
  }
}

function hasMarketSelector (payload: RecommendationRequest | undefined): boolean {
  return Boolean(
    payload?.market_question ||
    payload?.polymarket_market_id ||
    payload?.polymarket_market_slug ||
    payload?.polymarket_event_slug ||
    payload?.market_id
  )
}
