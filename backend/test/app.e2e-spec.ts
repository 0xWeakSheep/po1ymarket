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
            { url: 'https://example.com/a', score: 0.0 },
            { url: 'https://example.com/b', score: 0.0 }
          ],
          retrieval_meta: {
            query_count: 2,
            providers: [],
            total_candidates_before_scoring: 2,
            total_candidates_after_scoring: 2,
            stale_filtered_count: 0
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
        { url: 'https://example.com/a', score: 0.0 },
        { url: 'https://example.com/b', score: 0.0 }
      ],
      retrieval_meta: {
        query_count: 2,
        providers: [],
        total_candidates_before_scoring: 2,
        total_candidates_after_scoring: 2,
        stale_filtered_count: 0
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
