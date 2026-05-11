# Query LLM Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `query` 模块接入单阶段 LLM query planning，并保证任意失败时自动降级到现有规则 `query-builder`。

**Architecture:** 在 `QueryService.buildQueries` 增加“LLM 优先、规则兜底”编排。新增 `QueryPlanningClient` 负责单次模型调用，`domain` 侧完成 schema 校验、后处理和 fallback 判定。保持 `RetrievalService` 与 `RecommendationsService` 对外契约不变。

**Tech Stack:** NestJS, TypeScript, Jest，Planner 使用 **`openai` Chat Completions**（与 DeepSeek 兼容）；候选人打分路径可仍用 **`/responses`**。涉及 `recommendations` / `query` / `retrieval` 模块。

**2026-05-11：** 本文档内嵌的 `QueryPlanPayload` 代码片段已过时；以 `backend/src/recommendations/types/recommendations.ts` 与 `query-planning.schema.ts`（Zod）为准（仅三键）。


- Create: `backend/src/recommendations/query/integration/query-planning.client.ts`
- Create: `backend/src/recommendations/query/domain/query-planning.schema.ts`
- Create: `backend/src/recommendations/query/domain/query-planning.spec.ts`
- Modify: `backend/src/recommendations/query/domain/query.service.ts`
- Modify: `backend/src/recommendations/query/domain/query.service.spec.ts`
- Modify: `backend/src/recommendations/recommendations.module.ts`
- Modify: `backend/src/recommendations/types/recommendations.ts`
- Modify: `backend/src/recommendations/query/README.md`
- Modify: `docs/superpowers/search-current-state.md`
- Modify: `docs/superpowers/search-iteration-log.md`
- Modify: `task-board.md`

---

### Task 1: 定义 Query Planning 类型与校验器

**Files:**
- Create: `backend/src/recommendations/query/domain/query-planning.schema.ts`
- Modify: `backend/src/recommendations/types/recommendations.ts`
- Test: `backend/src/recommendations/query/domain/query-planning.spec.ts`

- [ ] **Step 1: 先写失败测试（schema + sanitize + fallback 触发前置）**

```ts
import {
  parseQueryPlanPayload,
  sanitizePlannedQueries
} from './query-planning.schema'

describe('query-planning.schema', () => {
  it('parses valid payload and keeps primary query', () => {
    const plan = parseQueryPlanPayload(JSON.stringify({
      primary_query: 'Will BTC close above 120k this month',
      variants: ['BTC price close above 120k May'],
      confidence: 0.86
    }))
    expect(plan.primary_query).toContain('BTC')
  })

  it('throws when payload is not valid JSON', () => {
    expect(() => parseQueryPlanPayload('not-json')).toThrow('invalid_json')
  })

  it('returns empty when all queries are invalid after sanitize', () => {
    const sanitized = sanitizePlannedQueries({
      primary_query: ' ',
      variants: [' ', '??'],
      confidence: 0.2
    }, 6)
    expect(sanitized.length).toBe(0)
  })
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm run test -- query/domain/query-planning.spec.ts`  
Expected: FAIL（因为 `query-planning.schema.ts` 还不存在）

- [ ] **Step 3: 写最小实现（解析 + 校验 + 清洗）**

```ts
export type QueryPlanPayload = {
  primary_query: string
  variants?: string[]
  intent_tags?: string[]
  entities?: string[]
  time_constraints?: string[]
  confidence?: number
}

export function parseQueryPlanPayload(raw: string): QueryPlanPayload {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('invalid_json')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('schema_violation')
  }

  const payload = parsed as QueryPlanPayload
  if (typeof payload.primary_query !== 'string' || !payload.primary_query.trim()) {
    throw new Error('schema_violation')
  }

  return payload
}

export function sanitizePlannedQueries (payload: QueryPlanPayload, maxQueries: number): string[] {
  const values = [payload.primary_query, ...(payload.variants ?? [])]
  const seen = new Set<string>()
  const queries: string[] = []

  for (const value of values) {
    const normalized = value.trim().replace(/\s+/g, ' ')
    if (!normalized || normalized.length < 3 || normalized.length > 160) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    queries.push(normalized)
    if (queries.length >= maxQueries) break
  }

  return queries
}
```

- [ ] **Step 4: 运行测试并确认通过**

Run: `npm run test -- query/domain/query-planning.spec.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/recommendations/query/domain/query-planning.schema.ts backend/src/recommendations/query/domain/query-planning.spec.ts backend/src/recommendations/types/recommendations.ts
git commit -m "feat(query): add query planning schema and sanitization"
```

---

### Task 2: 新增 QueryPlanningClient（单次 LLM 调用）

**Files:**
- Create: `backend/src/recommendations/query/integration/query-planning.client.ts`
- Modify: `backend/src/recommendations/recommendations.module.ts`
- Test: `backend/src/recommendations/query/domain/query.service.spec.ts`

- [ ] **Step 1: 先写失败测试（服务能调用 planner client）**

```ts
it('buildQueries uses planner output when available', async () => {
  const queryMarketProvider = { resolveQueryMarketInput: jest.fn() }
  const queryPlanningClient = {
    enabled: true,
    planQueries: jest.fn().mockResolvedValue({
      outputText: JSON.stringify({
        primary_query: 'Will BTC close above 120k this month?',
        variants: ['BTC close > 120k official source']
      })
    })
  }
  const service = new QueryService(queryMarketProvider as any, queryPlanningClient as any)
  const queries = await service.buildQueries({
    question: 'Will BTC close above 120k this month?'
  })
  expect(queryPlanningClient.planQueries).toHaveBeenCalled()
  expect(queries.length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm run test -- query/domain/query.service.spec.ts`  
Expected: FAIL（`QueryService` 构造器参数不匹配）

- [ ] **Step 3: 实现 QueryPlanningClient 与模块注册**

```ts
@Injectable()
export class QueryPlanningClient {
  readonly enabled: boolean

  constructor (@Inject(SETTINGS) private readonly settings: Settings) {
    this.enabled = Boolean(this.settings.openaiApiKey)
  }

  async planQueries (input: { question: string, description?: string, resolutionSource?: string }): Promise<{ outputText: string } | null> {
    if (!this.enabled || !this.settings.openaiApiKey) return null
    // 调用 /responses，返回 output_text
    // 出错统一 return null，由 domain 层决策 fallback
    return null
  }
}
```

- [ ] **Step 4: 在 `RecommendationsModule` 注入 provider**

Run update:

```ts
providers: [
  // ...
  QueryMarketProvider,
  QueryPlanningClient,
  QueryService,
  // ...
]
```

- [ ] **Step 5: 运行测试并确认通过**

Run: `npm run test -- query/domain/query.service.spec.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/recommendations/query/integration/query-planning.client.ts backend/src/recommendations/recommendations.module.ts backend/src/recommendations/query/domain/query.service.spec.ts
git commit -m "feat(query): add query planning client integration"
```

---

### Task 3: 在 QueryService 接入“LLM 优先 + 规则兜底”

**Files:**
- Modify: `backend/src/recommendations/query/domain/query.service.ts`
- Modify: `backend/src/recommendations/query/domain/query.service.spec.ts`
- Test: `backend/src/recommendations/query/domain/query.service.spec.ts`

- [ ] **Step 1: 先补失败测试（fallback 原因与 legacy 回退）**

```ts
it('falls back to legacy builder when planner returns invalid json', async () => {
  const service = new QueryService(
    { resolveQueryMarketInput: jest.fn() } as any,
    { enabled: true, planQueries: jest.fn().mockResolvedValue({ outputText: 'oops' }) } as any
  )
  const queries = await service.buildQueries({ question: 'Will Trump tweet today?' })
  expect(queries.some((q) => q.includes('Trump'))).toBe(true)
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm run test -- query/domain/query.service.spec.ts`  
Expected: FAIL（尚未处理 planner invalid_json fallback）

- [ ] **Step 3: 实现 `buildQueries` 异步编排逻辑**

```ts
async buildQueries (input: {
  question: string
  description?: string
  resolutionSource?: string
}): Promise<string[]> {
  const fallback = () => buildSearchQueries(input)

  if (!this.queryPlanningClient.enabled) {
    return fallback()
  }

  const planned = await this.queryPlanningClient.planQueries(input)
  if (!planned?.outputText) {
    return fallback()
  }

  try {
    const payload = parseQueryPlanPayload(planned.outputText)
    const queries = sanitizePlannedQueries(payload, 6)
    if (queries.length < 2) return fallback()
    return queries
  } catch {
    return fallback()
  }
}
```

- [ ] **Step 4: 修正调用方（`resolveQueries`/`resolveMarketContext`）**

```ts
searchQueries: await this.buildQueries(queryMarketInput)
```

- [ ] **Step 5: 跑测试确保通过**

Run: `npm run test -- query/domain/query.service.spec.ts query/domain/query-builder.spec.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/recommendations/query/domain/query.service.ts backend/src/recommendations/query/domain/query.service.spec.ts
git commit -m "feat(query): enable llm-first query planning with legacy fallback"
```

---

### Task 4: 文档与回归验证

**Files:**
- Modify: `backend/src/recommendations/query/README.md`
- Modify: `docs/superpowers/search-current-state.md`
- Modify: `docs/superpowers/search-iteration-log.md`
- Modify: `task-board.md`

- [ ] **Step 1: 更新 query 模块说明文档**

要点：

- 新增“LLM planner + fallback”流程说明；
- 明确失败时降级到 `query-builder`；
- 记录最小观测字段（source/fallback_reason/latency）。

- [ ] **Step 2: 更新现状文档和迭代日志**

Run edits:

- `search-current-state.md`：更新“最后更新”与变更记录；
- `search-iteration-log.md`：新增一条“Query LLM 单阶段接入（无灰度）”；
- `task-board.md`：刷新 Source Recommendation 当前进度/下一步。

- [ ] **Step 3: 执行回归命令**

Run: `npm run test -- query/domain/query-planning.spec.ts query/domain/query.service.spec.ts query/domain/query-builder.spec.ts`  
Expected: PASS

Run: `npm run test -- recommendations`  
Expected: PASS（或至少无新增失败）

- [ ] **Step 4: Commit**

```bash
git add backend/src/recommendations/query/README.md docs/superpowers/search-current-state.md docs/superpowers/search-iteration-log.md task-board.md
git commit -m "docs(search): record query llm planner architecture and progress"
```

---

### Task 5: 总体验收与交付

**Files:**
- Modify: `backend/src/recommendations/query/domain/query.service.ts`（仅当验收发现问题）
- Test: `backend/src/recommendations/query/domain/query.service.spec.ts`

- [ ] **Step 1: 手工验收 `POST /api/v1/search/queries` 两条路径**

Run:

```bash
curl -s -X POST "http://localhost:3000/api/v1/search/queries" \
  -H "Content-Type: application/json" \
  -d '{"market_question":"Will BTC close above 120k this month?"}'
```

Expected:

- 有 `searchQueries`；
- 当模拟 LLM 失败时仍返回规则生成的查询。

- [ ] **Step 2: 手工验收 `/api/v1/recommendations` 无回归**

Run:

```bash
curl -s -X POST "http://localhost:3000/api/v1/recommendations" \
  -H "Content-Type: application/json" \
  -d '{"market_question":"Will BTC close above 120k this month?"}'
```

Expected:

- 返回 `recommended_sources`；
- 无 5xx；
- 查询链路可看到 `llm` 或 `legacy` 的来源日志。

- [ ] **Step 3: 最终提交**

```bash
git add .
git commit -m "feat(query): improve semantic query planning with robust fallback"
```

