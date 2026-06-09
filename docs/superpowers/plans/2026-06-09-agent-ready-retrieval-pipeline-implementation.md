# Agent-ready Retrieval Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `market -> query -> retrieval -> scoring -> recommended_sources` 做成可解释、可测试、agent 可消费的推荐链路。

**Architecture:** 保持现有 NestJS 分层，不引入向量库、网页正文抓取或独立 fetch service。本计划只扩展类型契约、阶段 meta、真实 score 输出、前端 wire type 和测试，让一次推荐请求能从 HTTP 响应解释整条链路。

**Tech Stack:** NestJS, TypeScript, Jest, Supertest, Next.js frontend types, Vitest.

---

## 文件结构

- `backend/src/recommendations/types/recommendations.ts`
  - 新增 `MarketMeta`、`QueryMeta`、`CandidateScoreDebug`、`RecommendedSource`、`ScoringMeta`。
  - 扩展 `MarketContext`、`RetrievalMeta`、`RecommendationResponse`、`QueryPreviewResponse`。
- `backend/src/recommendations/query/integration/query-market.provider.ts`
  - 在解析市场输入时生成 `market_meta`。
- `backend/src/recommendations/query/domain/query.service.ts`
  - 从最终 `searchQueries` 派生 `query_meta`，并放入 query preview 与 recommendation market context。
- `backend/src/recommendations/retrieval/integration/search.client.ts`
  - 在 `retrieval_meta` 中加入 `strategy` 与 `candidate_limit`。
- `backend/src/recommendations/recommendations.service.ts`
  - 返回真实 score、title、provider、source_type、rationale、`scoring_meta`，并在 debug 模式下返回 `debug_score`。
- `backend/src/recommendations/**/*.spec.ts` 与 `backend/test/app.e2e-spec.ts`
  - 覆盖每层新契约。
- `frontend/types/recommendation.ts`
  - 对齐新的 wire response 类型。
- `frontend/api/recommendations.ts`
  - 使用 title/provider/rationale 等字段生成 UI row。
- `frontend/tests/results-panel.test.tsx`
  - 覆盖新 source 字段映射。
- `backend/README.md`、`backend/src/recommendations/query/README.md`、`backend/src/recommendations/retrieval/SEARCH-IO.md`、`docs/superpowers/search-current-state.md`、`task-board.md`
  - 同步链路契约与当前进度。

---

### Task 1: 后端响应类型契约

**Files:**
- Modify: `backend/src/recommendations/types/recommendations.ts`
- Test: `backend/src/recommendations/types/recommendations.ts` via downstream compile/tests

- [ ] **Step 1: 更新后端类型**

Replace the relevant type section in `backend/src/recommendations/types/recommendations.ts` with these additions and edits:

```ts
export type SourceType = 'news' | 'social' | 'official'

export type MarketInputType =
  | 'polymarket_market_id'
  | 'polymarket_market_slug'
  | 'polymarket_event_slug'
  | 'legacy_market_id'
  | 'market_question'

export type MarketMeta = {
  input_type: MarketInputType
  resolved_from_polymarket: boolean
  fallback_used?: boolean
}

export type QueryMeta = {
  query_count: number
  primary_query: string
  variants: string[]
}
```

Then extend `MarketContext`:

```ts
export type MarketContext = {
  marketId?: string
  marketSlug?: string
  eventSlug?: string
  question: string
  description?: string
  resolutionSource?: string
  endDate?: Date
  searchQueries: string[]
  planning_meta?: QueryPlanningMeta
  market_meta?: MarketMeta
  query_meta?: QueryMeta
}
```

Replace `RetrievalMeta`, `RecommendedLink`, and `RecommendationResponse` with:

```ts
export type RetrievalMeta = {
  strategy: 'fixed_provider_mix'
  candidate_limit: number
  query_count: number
  providers: RetrievalProviderDebug[]
  total_candidates_before_scoring: number
  total_candidates_after_scoring?: number
  stale_filtered_count?: number
}

export type CandidateScoreDebug = {
  relevance_score: number
  freshness_score: number
  ai_score: number
  total_score: number
  stale: boolean
  stale_reason?: string
}

export type RecommendedSource = {
  url: string
  score: number
  title?: string
  provider?: string
  source_type?: SourceType
  rationale?: string
  debug_score?: CandidateScoreDebug
}

export type ScoringMeta = {
  scored_count: number
  returned_count: number
  stale_filtered_count: number
  llm_rerank_enabled: boolean
}

export type RecommendationResponse = {
  recommended_sources: RecommendedSource[]
  market_meta?: MarketMeta
  planning_meta?: QueryPlanningMeta
  query_meta?: QueryMeta
  retrieval_meta?: RetrievalMeta
  scoring_meta?: ScoringMeta
}
```

Extend `QueryPreviewResponse`:

```ts
export type QueryPreviewResponse = {
  question: string
  description?: string
  resolutionSource?: string
  searchQueries: string[]
  planning_meta?: QueryPlanningMeta
  market_meta?: MarketMeta
  query_meta?: QueryMeta
}
```

- [ ] **Step 2: 运行类型相关测试，确认当前实现还未满足新契约**

Run:

```bash
cd backend
npm test -- --runInBand recommendations
```

Expected: FAIL or TypeScript/Jest failures caused by missing `strategy`, `candidate_limit`, `market_meta`, `query_meta`, or `scoring_meta` implementations.

- [ ] **Step 3: Commit**

```bash
git add backend/src/recommendations/types/recommendations.ts
git commit -m "feat(search): define agent-ready recommendation response types"
```

---

### Task 2: Market 与 Query meta

**Files:**
- Modify: `backend/src/recommendations/query/integration/query-market.provider.ts`
- Modify: `backend/src/recommendations/query/integration/query-market.provider.spec.ts`
- Modify: `backend/src/recommendations/query/domain/query.service.ts`
- Modify: `backend/src/recommendations/query/domain/query.service.spec.ts`

- [ ] **Step 1: 写 market meta 失败测试**

Add assertions to `backend/src/recommendations/query/integration/query-market.provider.spec.ts`:

```ts
expect(result.market_meta).toEqual({
  input_type: 'polymarket_market_id',
  resolved_from_polymarket: true,
  fallback_used: false
})
```

In the legacy market id test, add:

```ts
expect(result.market_meta).toEqual({
  input_type: 'legacy_market_id',
  resolved_from_polymarket: true,
  fallback_used: false
})
```

In the plain `market_question` test, add:

```ts
expect(result.market_meta).toEqual({
  input_type: 'market_question',
  resolved_from_polymarket: false,
  fallback_used: false
})
```

- [ ] **Step 2: Run failing market meta tests**

Run:

```bash
cd backend
npm test -- query/integration/query-market.provider.spec.ts --runInBand
```

Expected: FAIL because `market_meta` is not returned yet.

- [ ] **Step 3: Implement market meta**

In `backend/src/recommendations/query/integration/query-market.provider.ts`, update imports:

```ts
import type {
  MarketContext,
  MarketInputType,
  RecommendationRequest
} from '../../types/recommendations'
```

Add helper:

```ts
function getMarketInputType (request: RecommendationRequest): MarketInputType {
  if (request.polymarket_market_id?.trim()) return 'polymarket_market_id'
  if (request.polymarket_market_slug?.trim()) return 'polymarket_market_slug'
  if (request.polymarket_event_slug?.trim()) return 'polymarket_event_slug'
  if (request.market_id?.trim()) return 'legacy_market_id'
  return 'market_question'
}
```

At the start of `resolveQueryMarketInput`, compute:

```ts
const inputType = getMarketInputType(request)
```

When `market` exists, include:

```ts
market_meta: {
  input_type: inputType,
  resolved_from_polymarket: true,
  fallback_used: false
}
```

When plain market input is used, include:

```ts
market_meta: {
  input_type: inputType,
  resolved_from_polymarket: false,
  fallback_used: false
}
```

- [ ] **Step 4: Add query meta tests**

In `backend/src/recommendations/query/domain/query.service.spec.ts`, add a new `resolveQueries` test for planner output:

```ts
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
```

Add expectations to the existing `resolveQueries 在有 market_id 时优先使用用户覆盖字段` fallback-path test:

```ts
expect(result.query_meta?.query_count).toBe(result.searchQueries.length)
expect(result.query_meta?.primary_query).toBe(result.searchQueries[0])
expect(result.query_meta?.variants).toEqual(result.searchQueries.slice(1))
```

- [ ] **Step 5: Run failing query meta tests**

Run:

```bash
cd backend
npm test -- query/domain/query.service.spec.ts --runInBand
```

Expected: FAIL because `query_meta` is not returned yet.

- [ ] **Step 6: Implement query meta**

In `backend/src/recommendations/query/domain/query.service.ts`, add helper:

```ts
function buildQueryMeta (searchQueries: string[]): QueryMeta {
  return {
    query_count: searchQueries.length,
    primary_query: searchQueries[0] ?? '',
    variants: searchQueries.slice(1)
  }
}
```

Update imports to include `QueryMeta`.

In `resolveQueries`, after `planSearchQueries`, compute:

```ts
const queryMeta = buildQueryMeta(searchQueries)
```

Return:

```ts
return {
  question: queryMarketInput.question,
  description: queryMarketInput.description,
  resolutionSource: queryMarketInput.resolutionSource,
  searchQueries,
  planning_meta: planningMeta,
  market_meta: queryMarketInput.market_meta,
  query_meta: queryMeta
}
```

In `resolveMarketContext`, return:

```ts
return {
  marketId: queryMarketInput.marketId,
  marketSlug: queryMarketInput.marketSlug,
  eventSlug: queryMarketInput.eventSlug,
  question: queryMarketInput.question,
  description: queryMarketInput.description,
  resolutionSource: queryMarketInput.resolutionSource,
  endDate: queryMarketInput.endDate,
  searchQueries,
  planning_meta: planningMeta,
  market_meta: queryMarketInput.market_meta,
  query_meta: buildQueryMeta(searchQueries)
}
```

- [ ] **Step 7: Run tests**

Run:

```bash
cd backend
npm test -- query/integration/query-market.provider.spec.ts query/domain/query.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/recommendations/query/integration/query-market.provider.ts backend/src/recommendations/query/integration/query-market.provider.spec.ts backend/src/recommendations/query/domain/query.service.ts backend/src/recommendations/query/domain/query.service.spec.ts
git commit -m "feat(search): expose market and query metadata"
```

---

### Task 3: Retrieval meta 补齐 strategy 与 candidate limit

**Files:**
- Modify: `backend/src/recommendations/retrieval/integration/search.client.ts`
- Modify: `backend/src/recommendations/retrieval/domain/retrieval.service.spec.ts`
- Create or Modify: `backend/src/recommendations/retrieval/integration/search.client.spec.ts`

- [ ] **Step 1: Add SearchClient metadata test**

Create `backend/src/recommendations/retrieval/integration/search.client.spec.ts` with:

```ts
import { SearchClient } from './search.client'

describe('SearchClient', () => {
  it('returns retrieval strategy and candidate limit metadata when providers return no results', async () => {
    const client = new SearchClient({
      googleNewsBaseUrl: 'https://news.example.com/rss',
      redditSearchBaseUrl: 'https://reddit.example.com/search.json',
      userAgent: 'po1market-test',
      requestTimeoutSeconds: 1
    } as any)

    const originalFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
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
      global.fetch = originalFetch
    }
  })
})
```

- [ ] **Step 2: Run failing retrieval test**

Run:

```bash
cd backend
npm test -- retrieval/integration/search.client.spec.ts --runInBand
```

Expected: FAIL because `strategy` and `candidate_limit` are not present.

- [ ] **Step 3: Implement retrieval metadata**

In `backend/src/recommendations/retrieval/integration/search.client.ts`, update the returned `retrievalMeta`:

```ts
retrievalMeta: {
  strategy: 'fixed_provider_mix',
  candidate_limit: input.candidateLimit,
  query_count: input.queries.length,
  providers,
  total_candidates_before_scoring: deduped.length
}
```

- [ ] **Step 4: Update existing retrieval service test fixtures**

In `backend/src/recommendations/retrieval/domain/retrieval.service.spec.ts`, any expected `retrievalMeta` object should include:

```ts
strategy: 'fixed_provider_mix',
candidate_limit: 5,
```

Use the candidate limit value already present in the fixture.

- [ ] **Step 5: Run retrieval tests**

Run:

```bash
cd backend
npm test -- retrieval --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/recommendations/retrieval/integration/search.client.ts backend/src/recommendations/retrieval/integration/search.client.spec.ts backend/src/recommendations/retrieval/domain/retrieval.service.spec.ts
git commit -m "feat(search): expose retrieval strategy metadata"
```

---

### Task 4: Recommended sources 返回真实分数和 scoring meta

**Files:**
- Create: `backend/src/recommendations/recommendations.service.spec.ts`
- Modify: `backend/src/recommendations/recommendations.service.ts`
- Modify: `backend/src/recommendations/scoring.service.spec.ts`

- [ ] **Step 1: Add RecommendationsService response assembly test**

Create `backend/src/recommendations/recommendations.service.spec.ts`:

```ts
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
})
```

- [ ] **Step 2: Run failing service test**

Run:

```bash
cd backend
npm test -- recommendations.service.spec.ts --runInBand
```

Expected: FAIL because current response still returns `score: 0` and does not expose new meta.

- [ ] **Step 3: Implement source mapping helpers**

In `backend/src/recommendations/recommendations.service.ts`, add helper functions below the class:

```ts
function roundScore (value: number | undefined): number {
  return Number((value ?? 0).toFixed(4))
}

function toRecommendedSource (candidate: CandidateSource, includeDebug: boolean): RecommendedSource {
  return {
    url: candidate.url,
    score: roundScore(candidate.totalScore),
    title: candidate.title,
    provider: candidate.provider,
    source_type: candidate.sourceType,
    rationale: candidate.rationale,
    ...(includeDebug
      ? {
          debug_score: {
            relevance_score: roundScore(candidate.relevanceScore),
            freshness_score: roundScore(candidate.freshnessScore),
            ai_score: roundScore(candidate.aiScore),
            total_score: roundScore(candidate.totalScore),
            stale: Boolean(candidate.stale),
            stale_reason: candidate.staleReason
          }
        }
      : {})
  }
}
```

Update imports:

```ts
import {
  type CandidateSource,
  type RecommendedSource,
  type RecommendationRequest,
  type RecommendationResponse
} from './types/recommendations'
```

- [ ] **Step 4: Update RecommendationsService response**

In `recommend`, compute:

```ts
const includeDebugScore = this.settings.queryDebugEnabled
const staleFilteredCount = scoredCandidates.filter((candidate) => candidate.stale).length
const recommended = scoredCandidates
  .filter((candidate) => !candidate.stale)
  .slice(0, normalizedRequest.max_results ?? this.settings.marketDefaultLimit)
const recommendedSources = recommended.map((candidate) =>
  toRecommendedSource(candidate, includeDebugScore)
)
```

Return:

```ts
return {
  recommended_sources: recommendedSources,
  market_meta: retrievalResult.market.market_meta,
  planning_meta: retrievalResult.market.planning_meta,
  query_meta: retrievalResult.market.query_meta,
  retrieval_meta: retrievalMeta,
  scoring_meta: {
    scored_count: scoredCandidates.length,
    returned_count: recommendedSources.length,
    stale_filtered_count: staleFilteredCount,
    llm_rerank_enabled: this.settings.llmRerankEnabled
  }
}
```

- [ ] **Step 5: Add debug score test**

In `backend/src/recommendations/recommendations.service.spec.ts`, add:

```ts
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
```

- [ ] **Step 6: Run service tests**

Run:

```bash
cd backend
npm test -- recommendations.service.spec.ts scoring.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/recommendations/recommendations.service.ts backend/src/recommendations/recommendations.service.spec.ts backend/src/recommendations/scoring.service.spec.ts
git commit -m "feat(search): return explainable recommended sources"
```

---

### Task 5: E2E response shape

**Files:**
- Modify: `backend/test/app.e2e-spec.ts`

- [ ] **Step 1: Update e2e mocked response**

In `backend/test/app.e2e-spec.ts`, update the mocked service response in the first test:

```ts
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
```

Update the expected body to match the same object.

- [ ] **Step 2: Run e2e test**

Run:

```bash
cd backend
npm run test:e2e -- --runInBand
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/test/app.e2e-spec.ts
git commit -m "test(search): cover agent-ready response shape"
```

---

### Task 6: 前端 wire type 与结果映射

**Files:**
- Modify: `frontend/types/recommendation.ts`
- Modify: `frontend/api/recommendations.ts`
- Modify: `frontend/tests/results-panel.test.tsx`

- [ ] **Step 1: Update frontend types**

In `frontend/types/recommendation.ts`, add:

```ts
export type SourceTypeWire = "news" | "social" | "official";

export type MarketMetaWire = {
  input_type:
    | "polymarket_market_id"
    | "polymarket_market_slug"
    | "polymarket_event_slug"
    | "legacy_market_id"
    | "market_question";
  resolved_from_polymarket: boolean;
  fallback_used?: boolean;
};

export type QueryMetaWire = {
  query_count: number;
  primary_query: string;
  variants: string[];
};

export type RetrievalMetaWire = {
  strategy: "fixed_provider_mix";
  candidate_limit: number;
  query_count: number;
  providers: Array<{
    provider: string;
    query_count: number;
    candidate_count: number;
    failed_query_count: number;
    failure_reasons?: string[];
  }>;
  total_candidates_before_scoring: number;
  total_candidates_after_scoring?: number;
  stale_filtered_count?: number;
};

export type ScoringMetaWire = {
  scored_count: number;
  returned_count: number;
  stale_filtered_count: number;
  llm_rerank_enabled: boolean;
};
```

Replace `RecommendationApiJsonResponse` with:

```ts
export type RecommendationApiJsonResponse = {
  recommended_sources: Array<{
    url: string;
    score: number;
    title?: string;
    provider?: string;
    source_type?: SourceTypeWire;
    rationale?: string;
  }>;
  market_meta?: MarketMetaWire;
  planning_meta?: QueryPlanningMetaWire;
  query_meta?: QueryMetaWire;
  retrieval_meta?: RetrievalMetaWire;
  scoring_meta?: ScoringMetaWire;
};
```

Extend `RecommendedSourceRow`:

```ts
export type RecommendedSourceRow = {
  url: string;
  domain: string;
  label: string;
  reason: string;
  score: number;
  provider?: string;
  sourceType?: SourceTypeWire;
};
```

Extend success/no-results states with optional meta:

```ts
planning_meta?: QueryPlanningMetaWire;
market_meta?: MarketMetaWire;
query_meta?: QueryMetaWire;
retrieval_meta?: RetrievalMetaWire;
scoring_meta?: ScoringMetaWire;
```

- [ ] **Step 2: Update frontend mapping**

In `frontend/api/recommendations.ts`, after parsing `data`, keep meta:

```ts
const commonMeta = {
  planning_meta: data.planning_meta,
  market_meta: data.market_meta,
  query_meta: data.query_meta,
  retrieval_meta: data.retrieval_meta,
  scoring_meta: data.scoring_meta,
};
```

For no-results, return:

```ts
return { state: "no-results", results: [], ...commonMeta };
```

Update row mapping:

```ts
const results: RecommendedSourceRow[] = sources.map((s) => {
  const host = publicHostname(s.url);
  return {
    url: s.url,
    domain: host,
    label: s.title?.trim() || host,
    reason: s.rationale?.trim() || `由 ${s.provider ?? "推荐接口"} 返回。`,
    score: typeof s.score === "number" ? s.score : 0,
    provider: s.provider,
    sourceType: s.source_type,
  };
});

return { state: "success", results, ...commonMeta };
```

- [ ] **Step 3: Update frontend test**

In `frontend/tests/results-panel.test.tsx`, update the mocked JSON:

```ts
json: async () => ({
  recommended_sources: [{
    url: "https://news.example.com/article",
    score: 0.91,
    title: "News article",
    provider: "google_news",
    source_type: "news",
    rationale: "Directly relevant."
  }],
  query_meta: {
    query_count: 1,
    primary_query: "btc 120k",
    variants: []
  },
  scoring_meta: {
    scored_count: 1,
    returned_count: 1,
    stale_filtered_count: 0,
    llm_rerank_enabled: false
  }
})
```

Add expectations:

```ts
expect(result.results[0]?.label).toBe("News article");
expect(result.results[0]?.reason).toBe("Directly relevant.");
expect(result.results[0]?.provider).toBe("google_news");
expect(result.results[0]?.sourceType).toBe("news");
expect(result.query_meta?.primary_query).toBe("btc 120k");
expect(result.scoring_meta?.returned_count).toBe(1);
```

- [ ] **Step 4: Run frontend tests**

Run:

```bash
cd frontend
npm test -- --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/types/recommendation.ts frontend/api/recommendations.ts frontend/tests/results-panel.test.tsx
git commit -m "feat(frontend): map agent-ready recommendation response"
```

---

### Task 7: 文档同步与最终验证

**Files:**
- Modify: `backend/README.md`
- Modify: `backend/src/recommendations/query/README.md`
- Modify: `backend/src/recommendations/retrieval/SEARCH-IO.md`
- Modify: `docs/superpowers/search-current-state.md`
- Modify: `task-board.md`

- [ ] **Step 1: Update backend README response summary**

In `backend/README.md`, replace the sentence:

```md
- **Response**: `RecommendationsService` **drops** candidates with `stale === true` before `max_results`; `recommended_sources[].score` is currently **always `0`** (placeholder).
```

with:

```md
- **Response**: `RecommendationsService` **drops** candidates with `stale === true` before `max_results`; `recommended_sources[]` now exposes real `score`, optional title/provider/source metadata, and the response carries `market_meta` / `query_meta` / `retrieval_meta` / `scoring_meta` for agent-ready diagnostics.
```

- [ ] **Step 2: Update query README**

In `backend/src/recommendations/query/README.md`, update the response examples to include:

```json
"market_meta": {
  "input_type": "market_question",
  "resolved_from_polymarket": false,
  "fallback_used": false
},
"query_meta": {
  "query_count": 3,
  "primary_query": "Will BTC close above 120k this month?",
  "variants": [
    "BTC close above 120k",
    "BTC close above 120k official source"
  ]
}
```

In section 6.1, replace the note saying `recommended_sources[].score` is always `0` with:

```md
- `recommended_sources[].score` 透出服务端排序使用的 `totalScore`，并附带最小 source 上下文；Debug 模式下可附带 `debug_score`。
```

- [ ] **Step 3: Update SEARCH-IO**

In `backend/src/recommendations/retrieval/SEARCH-IO.md`, update the `RetrievalMeta` section to include:

```md
| `strategy` | `'fixed_provider_mix'` | 当前固定策略：每条 query 搜 Google News + Reddit，官方来源单独注入 |
| `candidate_limit` | number | 本轮召回候选池上限 |
```

- [ ] **Step 4: Update current state and task board**

In `docs/superpowers/search-current-state.md`, update the product-state section to say the response now exposes agent-ready metadata:

```md
- 当前响应已按阶段透出 `market_meta`、`planning_meta`、`query_meta`、`retrieval_meta`、`scoring_meta`，便于从 HTTP 响应定位 market/query/retrieval/scoring 哪一层影响最终推荐。
```

In `task-board.md`, update Source Recommendation API current progress:

```md
- 推荐响应已从占位 `score: 0` 升级为真实排序分，并透出 market/query/retrieval/scoring 分阶段 meta，便于 agent 和前端调试消费。
```

- [ ] **Step 5: Run full backend verification**

Run:

```bash
cd backend
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
```

Expected: all commands PASS.

- [ ] **Step 6: Run frontend verification**

Run:

```bash
cd frontend
npm test -- --runInBand
npm run build
```

Expected: all commands PASS.

- [ ] **Step 7: Final status check**

Run:

```bash
git status --short
git log --oneline -8
```

Expected:

- `git status --short` shows only intentional documentation changes staged or ready to stage.
- Recent commits include the six implementation commits from this plan.

- [ ] **Step 8: Commit docs**

```bash
git add backend/README.md backend/src/recommendations/query/README.md backend/src/recommendations/retrieval/SEARCH-IO.md docs/superpowers/search-current-state.md task-board.md
git commit -m "docs(search): document agent-ready recommendation pipeline"
```
