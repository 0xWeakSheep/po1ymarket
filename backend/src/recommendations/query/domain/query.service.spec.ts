import { QueryService } from './query.service'

/** 单测用 Settings（仅用到 query_debug 分支；其余字段由业务忽略） */
const testSettingsNoDebug = (): { queryDebugEnabled: boolean } => ({
  queryDebugEnabled: false
})

describe('QueryService', () => {
  const queryPlanningClientDisabled = {
    enabled: false,
    planQueries: jest.fn()
  }

  it('resolveQueries 在有 market_id 时优先使用用户覆盖字段', async () => {
    const queryMarketProvider = {
      resolveQueryMarketInput: jest.fn().mockResolvedValue({
        marketId: 'm1',
        question: 'Will BTC close above 120k this month?',
        description: 'Polymarket description',
        resolutionSource: 'https://polymarket.com/source',
        endDate: new Date('2026-12-31T00:00:00.000Z')
      })
    }

    const service = new QueryService(
      queryMarketProvider as any,
      queryPlanningClientDisabled as any,
      testSettingsNoDebug() as any
    )
    const result = await service.resolveQueries({
      market_id: 'm1',
      market_question: 'Will BTC close above 120k this month?'
    })

    expect(queryMarketProvider.resolveQueryMarketInput).toHaveBeenCalledWith({
      market_id: 'm1',
      market_question: 'Will BTC close above 120k this month?'
    })
    expect(result.question).toBe('Will BTC close above 120k this month?')
    expect(result.searchQueries.length).toBeGreaterThan(0)
    expect(result.query_meta?.query_count).toBe(result.searchQueries.length)
    expect(result.query_meta?.primary_query).toBe(result.searchQueries[0])
    expect(result.query_meta?.variants).toEqual(result.searchQueries.slice(1))
  })

  it('resolveQueries returns query_meta from planner output', async () => {
    const queryMarketProvider = {
      resolveQueryMarketInput: jest.fn().mockResolvedValue({
        question: 'Will BTC close above 120k this month?',
        market_meta: {
          input_type: 'market_question',
          resolved_from_polymarket: false,
          fallback_used: false
        }
      })
    }
    const queryPlanningClient = {
      enabled: true,
      planQueries: jest.fn().mockResolvedValue({
        ok: true,
        outputText: JSON.stringify({
          primary_query: 'Will BTC close above 120k this month?',
          variants: ['BTC close above 120k official source']
        })
      })
    }
    const service = new QueryService(
      queryMarketProvider as any,
      queryPlanningClient as any,
      testSettingsNoDebug() as any
    )

    const result = await service.resolveQueries({
      market_question: 'Will BTC close above 120k this month?'
    })

    expect(result.query_meta).toEqual({
      query_count: 2,
      primary_query: 'Will BTC close above 120k this month?',
      variants: ['BTC close above 120k official source']
    })
    expect(result.market_meta).toEqual({
      input_type: 'market_question',
      resolved_from_polymarket: false,
      fallback_used: false
    })
  })

  it('resolveMarketContext 返回推荐链路需要的完整上下文', async () => {
    const queryMarketProvider = {
      resolveQueryMarketInput: jest.fn().mockResolvedValue({
        marketId: 'm2',
        marketSlug: 'eth-reach-10k',
        eventSlug: 'eth-price-targets',
        question: 'Will ETH reach 10k?',
        description: 'ETH target market',
        resolutionSource: 'https://example.com/source',
        endDate: new Date('2026-08-01T00:00:00.000Z'),
        market_meta: {
          input_type: 'legacy_market_id',
          resolved_from_polymarket: true,
          fallback_used: false
        }
      })
    }

    const service = new QueryService(
      queryMarketProvider as any,
      queryPlanningClientDisabled as any,
      testSettingsNoDebug() as any
    )
    const marketContext = await service.resolveMarketContext({
      market_id: 'm2'
    })

    expect(marketContext.marketId).toBe('m2')
    expect(marketContext.marketSlug).toBe('eth-reach-10k')
    expect(marketContext.eventSlug).toBe('eth-price-targets')
    expect(marketContext.question).toBe('Will ETH reach 10k?')
    expect(marketContext.searchQueries.length).toBeGreaterThan(0)
    expect(marketContext.market_meta).toEqual({
      input_type: 'legacy_market_id',
      resolved_from_polymarket: true,
      fallback_used: false
    })
    expect(marketContext.query_meta).toEqual({
      query_count: marketContext.searchQueries.length,
      primary_query: marketContext.searchQueries[0],
      variants: marketContext.searchQueries.slice(1)
    })
  })

  it('buildQueries 会追加 official source 查询词', async () => {
    const service = new QueryService(
      { resolveQueryMarketInput: jest.fn() } as any,
      queryPlanningClientDisabled as any,
      testSettingsNoDebug() as any
    )
    const queries = await service.buildQueries({
      question: 'Will Trump tweet today?',
      resolutionSource: 'https://truthsocial.com'
    })

    expect(queries[0]).toBe('Will Trump tweet today?')
    expect(queries.some((query) => query.includes('official source'))).toBe(true)
  })

  it('buildQueries uses planner output when available', async () => {
    const queryMarketProvider = { resolveQueryMarketInput: jest.fn() }
    const queryPlanningClient = {
      enabled: true,
      planQueries: jest.fn().mockResolvedValue({
        ok: true,
        outputText: JSON.stringify({
          primary_query: 'Will BTC close above 120k this month?',
          variants: ['BTC close above 120k official source']
        })
      })
    }
    const service = new QueryService(
      queryMarketProvider as any,
      queryPlanningClient as any,
      testSettingsNoDebug() as any
    )
    const queries = await service.buildQueries({
      question: 'Will BTC close above 120k this month?'
    })
    expect(queryPlanningClient.planQueries).toHaveBeenCalled()
    expect(queries.length).toBeGreaterThan(0)
  })

  it('falls back to legacy builder when planner returns invalid json', async () => {
    const service = new QueryService(
      { resolveQueryMarketInput: jest.fn() } as any,
      { enabled: true, planQueries: jest.fn().mockResolvedValue({ ok: true, outputText: 'oops' }) } as any,
      { queryDebugEnabled: false } as any
    )
    const queries = await service.buildQueries({ question: 'Will Trump tweet today?' })
    expect(queries.some((query) => query.includes('Trump'))).toBe(true)
  })
})
