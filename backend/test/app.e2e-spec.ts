import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { InfraRecommendationsService } from '../src/infra/recommendations/infra-recommendations.service'

describe('App (e2e)', () => {
  it('POST /api/v1/recommendations returns payload from service', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(InfraRecommendationsService)
      .useValue({
        recommend: async () => ({
          recommended_sources: [
            {
              url: 'https://example.com/a',
              score: 0.82,
              title: 'Example A',
              provider: 'google_news',
              source_type: 'news'
            },
            {
              url: 'https://example.com/b',
              score: 0.71,
              title: 'Example B',
              provider: 'reddit',
              source_type: 'social'
            }
          ],
          market_meta: {
            input_type: 'market_question',
            resolved_from_polymarket: false,
            fallback_used: false
          },
          query_meta: {
            query_count: 2,
            primary_query: 'Will Trump tweet today?',
            variants: ['Trump tweet today official source']
          },
          retrieval_meta: {
            strategy: 'fixed_provider_mix',
            candidate_limit: 12,
            query_count: 2,
            providers: [],
            total_candidates_before_scoring: 2,
            total_candidates_after_scoring: 2,
            stale_filtered_count: 0
          },
          scoring_meta: {
            scored_count: 2,
            returned_count: 2,
            stale_filtered_count: 0,
            llm_rerank_enabled: false
          }
        })
      })
      .compile()

    const app = moduleRef.createNestApplication()
    await app.init()

    const response = await request(app.getHttpServer())
      .post('/api/v1/recommendations')
      .send({ market_question: 'Will Trump tweet today?' })
      .expect(200)

    expect(response.body).toEqual({
      recommended_sources: [
        {
          url: 'https://example.com/a',
          score: 0.82,
          title: 'Example A',
          provider: 'google_news',
          source_type: 'news'
        },
        {
          url: 'https://example.com/b',
          score: 0.71,
          title: 'Example B',
          provider: 'reddit',
          source_type: 'social'
        }
      ],
      market_meta: {
        input_type: 'market_question',
        resolved_from_polymarket: false,
        fallback_used: false
      },
      query_meta: {
        query_count: 2,
        primary_query: 'Will Trump tweet today?',
        variants: ['Trump tweet today official source']
      },
      retrieval_meta: {
        strategy: 'fixed_provider_mix',
        candidate_limit: 12,
        query_count: 2,
        providers: [],
        total_candidates_before_scoring: 2,
        total_candidates_after_scoring: 2,
        stale_filtered_count: 0
      },
      scoring_meta: {
        scored_count: 2,
        returned_count: 2,
        stale_filtered_count: 0,
        llm_rerank_enabled: false
      }
    })

    await app.close()
  })

  it('POST /api/v1/recommendations rejects empty input', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile()

    const app = moduleRef.createNestApplication()
    await app.init()

    const response = await request(app.getHttpServer())
      .post('/api/v1/recommendations')
      .send({})
      .expect(400)

    expect(JSON.stringify(response.body)).toMatch(/market_id|market_question/)

    await app.close()
  })

  it('GET /health returns ok', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile()

    const app = moduleRef.createNestApplication()
    await app.init()

    const response = await request(app.getHttpServer()).get('/health').expect(200)

    expect(response.body).toEqual({ status: 'ok' })

    await app.close()
  })
})
