import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post
} from '@nestjs/common'

import { QueryService } from '../domain/query.service'
import type { RecommendationRequest } from '../../types/recommendations'

@Controller('api/v1/search')
export class QueryController {
  constructor (private readonly queryService: QueryService) {}

  @Post('queries')
  @HttpCode(HttpStatus.OK)
  async create (@Body() payload: RecommendationRequest) {
    if (!hasMarketSelector(payload)) {
      throw new BadRequestException(
        'Provide at least one of market_question, polymarket_market_id, polymarket_market_slug, polymarket_event_slug, or legacy market_id.'
      )
    }

    return await this.queryService.resolveQueries(payload)
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
