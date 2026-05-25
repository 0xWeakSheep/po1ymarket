import { QueryMarketProvider } from './query-market.provider'

describe('QueryMarketProvider', () => {
  it('prefers explicit polymarket_market_id over other polymarket identifiers', async () => {
    const polymarketClient = {
      fetchMarketById: jest.fn().mockResolvedValue({
        marketId: '540816',
        marketSlug: 'market-slug',
        eventSlug: 'event-slug',
        question: 'Will BTC close above 120k this month?',
        description: 'from id',
        resolutionSource: 'https://example.com/id',
        endDate: new Date('2026-12-31T00:00:00.000Z'),
        searchQueries: []
      }),
      fetchMarketBySlug: jest.fn(),
      fetchEventBySlug: jest.fn()
    }

    const provider = new QueryMarketProvider(polymarketClient as any)
    const result = await provider.resolveQueryMarketInput({
      polymarket_market_id: '540816',
      polymarket_market_slug: 'should-not-be-used',
      polymarket_event_slug: 'should-not-be-used'
    })

    expect(polymarketClient.fetchMarketById).toHaveBeenCalledWith('540816')
    expect(polymarketClient.fetchMarketBySlug).not.toHaveBeenCalled()
    expect(polymarketClient.fetchEventBySlug).not.toHaveBeenCalled()
    expect(result.marketId).toBe('540816')
  })

  it('uses market slug when provided', async () => {
    const polymarketClient = {
      fetchMarketById: jest.fn(),
      fetchMarketBySlug: jest.fn().mockResolvedValue({
        marketId: 'm1',
        marketSlug: 'fed-decision-in-october-bps',
        eventSlug: 'fed-decision-in-october',
        question: 'Will the Fed cut by 25 bps in October?',
        description: 'from market slug',
        resolutionSource: 'https://example.com/slug',
        endDate: undefined,
        searchQueries: []
      }),
      fetchEventBySlug: jest.fn()
    }

    const provider = new QueryMarketProvider(polymarketClient as any)
    const result = await provider.resolveQueryMarketInput({
      polymarket_market_slug: 'fed-decision-in-october-bps'
    })

    expect(polymarketClient.fetchMarketBySlug).toHaveBeenCalledWith('fed-decision-in-october-bps')
    expect(result.marketSlug).toBe('fed-decision-in-october-bps')
    expect(result.eventSlug).toBe('fed-decision-in-october')
  })

  it('falls back to legacy market_id alias when explicit fields are absent', async () => {
    const polymarketClient = {
      fetchMarketById: jest.fn().mockResolvedValue({
        marketId: 'legacy-id',
        question: 'Legacy market',
        description: undefined,
        resolutionSource: undefined,
        endDate: undefined,
        searchQueries: []
      }),
      fetchMarketBySlug: jest.fn(),
      fetchEventBySlug: jest.fn()
    }

    const provider = new QueryMarketProvider(polymarketClient as any)
    const result = await provider.resolveQueryMarketInput({
      market_id: 'legacy-id'
    })

    expect(polymarketClient.fetchMarketById).toHaveBeenCalledWith('legacy-id')
    expect(result.marketId).toBe('legacy-id')
  })

  it('uses plain market_question when no polymarket identifier is provided', async () => {
    const polymarketClient = {
      fetchMarketById: jest.fn(),
      fetchMarketBySlug: jest.fn(),
      fetchEventBySlug: jest.fn()
    }

    const provider = new QueryMarketProvider(polymarketClient as any)
    const result = await provider.resolveQueryMarketInput({
      market_question: 'Will Trump tweet today?',
      market_description: 'custom prompt',
      resolution_source: 'https://truthsocial.com'
    })

    expect(polymarketClient.fetchMarketById).not.toHaveBeenCalled()
    expect(polymarketClient.fetchMarketBySlug).not.toHaveBeenCalled()
    expect(polymarketClient.fetchEventBySlug).not.toHaveBeenCalled()
    expect(result.question).toBe('Will Trump tweet today?')
    expect(result.description).toBe('custom prompt')
  })
})
