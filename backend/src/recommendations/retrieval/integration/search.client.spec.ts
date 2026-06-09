import { SearchClient } from './search.client'

describe('SearchClient', () => {
  it('returns retrieval strategy and candidate limit metadata when providers return no results', async () => {
    const client = new SearchClient({
      googleNewsBaseUrl: 'https://news.example.com/rss',
      redditSearchBaseUrl: 'https://reddit.example.com/search.json',
      userAgent: 'po1market-test',
      requestTimeoutSeconds: 1
    } as any)

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => '',
      json: async () => ({})
    } as any)

    try {
      const result = await client.gatherCandidates({
        queries: ['btc 120k'],
        candidateLimit: 12
      })

      expect(result.retrievalMeta.strategy).toBe('fixed_provider_mix')
      expect(result.retrievalMeta.candidate_limit).toBe(12)
      expect(result.retrievalMeta.query_count).toBe(1)
      expect(result.retrievalMeta.providers).toEqual([
        expect.objectContaining({ provider: 'google_news', failed_query_count: 1 }),
        expect.objectContaining({ provider: 'reddit', failed_query_count: 1 })
      ])
    } finally {
      fetchSpy.mockRestore()
    }
  })
})
