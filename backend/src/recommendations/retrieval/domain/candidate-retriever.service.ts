import { Inject, Injectable } from '@nestjs/common'

import { SETTINGS } from '../../../common/constants'
import type { Settings } from '../../../config/settings'
import type { CandidateSource, MarketContext } from '../../types/recommendations'
import { SearchClient } from '../integration/search.client'

@Injectable()
export class CandidateRetrieverService {
  constructor (
    @Inject(SETTINGS) private readonly settings: Settings,
    private readonly searchClient: SearchClient
  ) {}

  async retrieve (input: {
    market: MarketContext
    candidateLimit?: number
  }): Promise<CandidateSource[]> {
    return await this.searchClient.gatherCandidates({
      queries: input.market.searchQueries,
      resolutionSource: input.market.resolutionSource,
      candidateLimit: input.candidateLimit ?? this.settings.marketCandidateLimit
    })
  }
}
