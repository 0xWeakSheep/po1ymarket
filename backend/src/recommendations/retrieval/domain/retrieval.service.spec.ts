import { RetrievalService } from './retrieval.service'

describe('RetrievalService', () => {
  it('串联 query 与 candidate retrieval', async () => {
    const queryService = {
      resolveMarketContext: jest.fn().mockResolvedValue({
        question: 'Will BTC close above 120k?',
        description: 'BTC market',
        resolutionSource: 'https://example.com',
        searchQueries: ['btc 120k', 'btc 120k official source']
      })
    }
    const candidateRetriever = {
      retrieve: jest.fn().mockResolvedValue({
        candidates: [
          { title: 'A', url: 'https://a.com', sourceType: 'news', provider: 'google_news' }
        ],
        retrievalMeta: {
          query_count: 2,
          providers: [],
          total_candidates_before_scoring: 1
        }
      })
    }

    const service = new RetrievalService(queryService as any, candidateRetriever as any)
    const result = await service.retrieve({
      request: { market_question: 'Will BTC close above 120k?' },
      candidateLimit: 5
    })

    expect(queryService.resolveMarketContext).toHaveBeenCalled()
    expect(candidateRetriever.retrieve).toHaveBeenCalledWith({
      market: expect.objectContaining({ question: 'Will BTC close above 120k?' }),
      candidateLimit: 5
    })
    expect(result.candidates).toHaveLength(1)
    expect(result.retrievalMeta.total_candidates_before_scoring).toBe(1)
  })
})
