import { RecommendationsService } from './recommendations.service'

describe('RecommendationsService', () => {
  it('returns real source scores, source context, and scoring metadata', async () => {
    const retrievalService = {
      retrieve: jest.fn().mockResolvedValue({
        market: {
          question: 'Will BTC close above 120k this month?',
          searchQueries: ['btc 120k'],
          market_meta: {
            input_type: 'market_question',
            resolved_from_polymarket: false,
            fallback_used: false
          },
          planning_meta: {
            planner_configured: true,
            query_source: 'llm'
          },
          query_meta: {
            query_count: 1,
            primary_query: 'btc 120k',
            variants: []
          }
        },
        candidates: [
          {
            title: 'BTC hits new high',
            url: 'https://news.example.com/btc',
            snippet: 'Bitcoin market update',
            provider: 'google_news',
            sourceType: 'news',
            publishedAt: new Date('2026-06-01T00:00:00.000Z')
          }
        ],
        retrievalMeta: {
          strategy: 'fixed_provider_mix',
          candidate_limit: 12,
          query_count: 1,
          providers: [],
          total_candidates_before_scoring: 1
        }
      })
    }

    const scoringService = {
      scoreCandidates: jest.fn().mockResolvedValue([
        {
          title: 'BTC hits new high',
          url: 'https://news.example.com/btc',
          provider: 'google_news',
          sourceType: 'news',
          relevanceScore: 0.8,
          freshnessScore: 0.7,
          aiScore: 0.6,
          totalScore: 0.73,
          stale: false,
          rationale: 'Directly relevant and recent.'
        },
        {
          title: 'Old BTC article',
          url: 'https://news.example.com/old',
          provider: 'google_news',
          sourceType: 'news',
          relevanceScore: 0.2,
          freshnessScore: 0.1,
          aiScore: 0.2,
          totalScore: 0.12,
          stale: true,
          staleReason: 'Published too long ago.'
        }
      ])
    }

    const service = new RecommendationsService({
      marketCandidateLimit: 12,
      marketDefaultLimit: 5,
      queryDebugEnabled: false,
      llmRerankEnabled: true
    } as any, retrievalService as any, scoringService as any)

    const result = await service.recommend({
      market_question: 'Will BTC close above 120k this month?'
    })

    expect(result.recommended_sources).toEqual([
      {
        url: 'https://news.example.com/btc',
        score: 0.73,
        title: 'BTC hits new high',
        provider: 'google_news',
        source_type: 'news',
        rationale: 'Directly relevant and recent.'
      }
    ])
    expect(result.market_meta?.input_type).toBe('market_question')
    expect(result.query_meta?.primary_query).toBe('btc 120k')
    expect(result.scoring_meta).toEqual({
      scored_count: 2,
      returned_count: 1,
      stale_filtered_count: 1,
      llm_rerank_enabled: true
    })
  })

  it('includes debug_score when query debug is enabled', async () => {
    const retrievalService = {
      retrieve: jest.fn().mockResolvedValue({
        market: { question: 'Will BTC close above 120k?', searchQueries: ['btc'] },
        candidates: [],
        retrievalMeta: {
          strategy: 'fixed_provider_mix',
          candidate_limit: 10,
          query_count: 1,
          providers: [],
          total_candidates_before_scoring: 1
        }
      })
    }
    const scoringService = {
      scoreCandidates: jest.fn().mockResolvedValue([
        {
          title: 'BTC report',
          url: 'https://news.example.com/btc',
          provider: 'google_news',
          sourceType: 'news',
          relevanceScore: 0.8,
          freshnessScore: 0.7,
          aiScore: 0.6,
          totalScore: 0.73,
          stale: false
        }
      ])
    }
    const service = new RecommendationsService({
      marketCandidateLimit: 10,
      marketDefaultLimit: 5,
      queryDebugEnabled: true,
      llmRerankEnabled: false
    } as any, retrievalService as any, scoringService as any)

    const result = await service.recommend({ market_question: 'Will BTC close above 120k?' })

    expect(result.recommended_sources[0]?.debug_score).toEqual({
      relevance_score: 0.8,
      freshness_score: 0.7,
      ai_score: 0.6,
      total_score: 0.73,
      stale: false,
      stale_reason: undefined
    })
  })
})
