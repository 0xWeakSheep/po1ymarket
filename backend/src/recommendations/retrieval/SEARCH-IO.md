# 搜索 / 召回层：参数与接口约定

> **受众**：负责「多源检索、配额、去重、新 provider」的同学。  
> **原则**：本层为 **代码执行**（HTTP + 解析），契约稳定后再改实现；与 **Query（LLM/规则产检索词）**、**Scoring（打分）** 边界见文末。

**权威类型**：`backend/src/recommendations/types/recommendations.ts`（`MarketContext`、`CandidateSource`、`RecommendationRequest`）。

---

## 1. 调用链（从推荐入口到搜索）

```
RecommendationsService.recommend
  → normalizeRequest(request)
  → RetrievalService.retrieve({ request, candidateLimit? })
       → QueryService.resolveMarketContext(request)   // 产出 MarketContext（含 searchQueries）
       → CandidateRetrieverService.retrieve({ market, candidateLimit? })
            → SearchClient.gatherCandidates({ queries, resolutionSource?, candidateLimit })
                 // 返回 { candidates, retrievalMeta }
```

实现文件：

| 层级 | 文件 |
|------|------|
| 编排 | `retrieval/domain/retrieval.service.ts` |
| 检索编排 | `retrieval/domain/candidate-retriever.service.ts` |
| 多源执行 | `retrieval/integration/search.client.ts` |

---

## 2. `RetrievalService.retrieve`（检索模块总入口）

### 输入

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `request` | `RecommendationRequest` | 是 | 与 `POST /api/v1/recommendations` 体一致（经 `normalizeRequest` 后传入；含默认 `max_results` / `candidate_limit` 等） |
| `candidateLimit` | `number` | 否 | **覆盖** `request.candidate_limit` 语义：传给下游的「候选池最大条数」；未传时使用 `Settings.marketCandidateLimit`（见 §6） |

### 输出

| 字段 | 类型 | 说明 |
|------|------|------|
| `market` | `MarketContext` | 含 `searchQueries`、`resolutionSource`、`planning_meta` 等，供日志与下游 |
| `candidates` | `CandidateSource[]` | 仅经过检索与去重截断；**尚未**打分 |
| `retrievalMeta` | `RetrievalMeta` | 检索阶段策略、候选池上限与召回统计，随推荐响应透出为 `retrieval_meta` |

---

## 3. `CandidateRetrieverService.retrieve`

### 输入

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `market` | `MarketContext` | 是 | 至少需可用：`searchQueries: string[]`、`resolutionSource?` |
| `candidateLimit` | `number` | 否 | 默认 `Settings.marketCandidateLimit` |

### 输出

`Promise<{ candidates: CandidateSource[]; retrievalMeta: RetrievalMeta }>`，语义与 `SearchClient.gatherCandidates` 一致。

### 映射到 `SearchClient`

```ts
gatherCandidates({
  queries: market.searchQueries,
  resolutionSource: market.resolutionSource,
  candidateLimit
})
```

---

## 4. `SearchClient.gatherCandidates`（搜索实现契约）

### 4.1 输入

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `queries` | `string[]` | 是 | 来自 `MarketContext.searchQueries`；**空数组**时仍会走后续逻辑，但外源请求条数预算会按 `max(1, queries.length)` 计算（见 §5） |
| `resolutionSource` | `string` | 否 | 若以 `http` 开头，会 **额外插入一条** `sourceType: 'official'` 的固定标题候选（见 §4.3） |
| `candidateLimit` | `number` | 是 | 返回数组 **最多** 该条数（去重后 `slice`） |

### 4.2 输出：`{ candidates, retrievalMeta }`

`SearchClient.gatherCandidates` 返回 `{ candidates, retrievalMeta }`，不是裸 `CandidateSource[]`。其中 `candidates` 内每条对象 **必须** 满足类型中的「召回最小集」；打分相关字段在检索阶段 **不填**（由 `ScoringService` 后续写入）。

| 字段 | 检索阶段 | 说明 |
|------|----------|------|
| `title` | 必填 | 展示用标题 |
| `url` | 必填 | **去重键**；同一 URL 只保留首次出现 |
| `snippet` | 可选 | 摘要或外链文本 |
| `sourceType` | 必填 | `'news' \| 'social' \| 'official'` |
| `provider` | 必填 | 实现层约定字符串，如 `google_news`、`reddit`、`polymarket` |
| `publishedAt` | 可选 | 有则尽量填 `Date`，供 freshness / stale |
| `relevanceScore` / `freshnessScore` / `aiScore` / `totalScore` / `stale` / `staleReason` / `rationale` | **不填** | 精排层职责 |

`retrievalMeta` 当前字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `strategy` | `'fixed_provider_mix'` | 当前固定策略：每条 query 搜 Google News + Reddit，官方来源单独注入 |
| `candidate_limit` | number | 本轮召回候选池上限 |

### 4.3 当前内置来源与 `provider` / `sourceType`

| 来源逻辑 | `provider` | `sourceType` | 备注 |
|----------|------------|----------------|------|
| `resolutionSource` 以 `http` 开头 | `polymarket` | `official` | 固定 title/snippet；可无 `publishedAt` |
| Google News RSS | `google_news` | `news` | `publishedAt` 来自 `pubDate` |
| Reddit `search.json` | `reddit` | `social` | `publishedAt` 来自 `created_utc` |

### 4.4 单 query 预算（实现公式，改逻辑时请同步本文）

- `queryBudget = floor(candidateLimit / max(1, queries.length))`，且至少为 `1`。
- 对每个 `query`：
  - Google News：最多取 `queryBudget` 条 item；
  - Reddit：最多 `max(1, floor(queryBudget / 3))` 条。

最后：**按 URL 去重**，再 **`slice(0, candidateLimit)`**。

### 4.5 HTTP 与失败行为（当前实现）

- 使用 `fetch`，超时 `Settings.requestTimeoutSeconds`（秒）→ `AbortController`。
- Header：`User-Agent: Settings.userAgent`。
- **非 2xx 或抛错**：`fetchText` 返回 `''`，`fetchJson` 返回 `{}`，上层解析得到 **0 条** 该源候选，**不抛异常**（整次 `gatherCandidates` 仍返回已有候选 + official 若存在）。

---

## 5. `MarketContext`（搜索侧关心的子集）

由 `QueryService.resolveMarketContext` 填充；搜索层 **只读**。

| 字段 | 类型 | 搜索侧用途 |
|------|------|------------|
| `searchQueries` | `string[]` | 传入 `gatherCandidates.queries` |
| `resolutionSource` | `string?` | 官方链接注入条件 |
| `question` / `description` / `endDate` | — | 当前 `SearchClient` **未使用**；新 provider 若需要可扩展 `gatherCandidates` 入参（需同步改 `CandidateRetrieverService`） |
| `planning_meta` | `QueryPlanningMeta?` | 不参与检索；仅随 `market` 透出 |

---

## 6. 相关配置（`Settings` / 环境变量）

| 配置项 | 环境变量（示例） | 与搜索的关系 |
|--------|------------------|--------------|
| `googleNewsBaseUrl` | `PO1MARKET_GOOGLE_NEWS_BASE_URL` | RSS 基址，默认 Google News RSS |
| `redditSearchBaseUrl` | `PO1MARKET_REDDIT_SEARCH_BASE_URL` | Reddit JSON search |
| `userAgent` | `PO1MARKET_USER_AGENT` | 所有 `fetch` |
| `requestTimeoutSeconds` | `PO1MARKET_REQUEST_TIMEOUT_SECONDS` | 单次 HTTP 超时 |
| `marketCandidateLimit` | `PO1MARKET_MARKET_CANDIDATE_LIMIT` | 默认候选池大小（与 API `candidate_limit` 二选一逻辑见 `normalizeRequest`） |

默认值以 `backend/src/config/settings.ts` 为准。

---

## 7. HTTP API 请求体（供对照，非 `SearchClient` 直连）

`RecommendationRequest`（`POST /api/v1/recommendations`）与检索相关的字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `market_id` | string? | 与 `market_question` 至少其一 |
| `market_question` | string? | 同上 |
| `market_description` | string? | 进入 market 上下文，供 query 使用 |
| `resolution_source` | string? | 进入 `MarketContext.resolutionSource` |
| `candidate_limit` | number? | 默认见 settings |
| `max_results` | number? | **最终返回给客户端的条数**（在 **scoring 之后** 截断），不直接等于 `gatherCandidates` 的池子大小 |

---

## 8. 扩展新信息源（约定）

1. **输出**：每条仍为 `CandidateSource`，填好 `provider`（唯一可读标识）与 `sourceType`（三选一或先与团队扩展枚举 + 类型定义）。  
2. **入参**：若需超出 `queries` / `resolutionSource` 的上下文，在 **`gatherCandidates` 或 `CandidateRetrieverService`** 扩展入参对象，并更新本文与调用方。  
3. **预算**：在总 `candidateLimit` 内分配；建议把「每源上限」写清，避免单源占满。  
4. **失败策略**：与现有一致时建议「失败返回空列表该源、不打断其它源」。

---

## 9. 与 Query / Scoring 的边界

| 模块 | 职责 |
|------|------|
| **Query** | 生成 `searchQueries`、可选 `planning_meta`；不执行外源 HTTP |
| **Search（本文）** | 仅根据 `MarketContext` 拉取并归并 `CandidateSource[]` |
| **Scoring** | 读 `CandidateSource` + `MarketContext`，写分数、`stale`；**过滤 stale** 在 `RecommendationsService` |

改本文时建议同步：`retrieval/README.md`、`task-board.md`（若行为或路径变更）。

---

## 10. 维护记录

| 日期 | 说明 |
|------|------|
| 2026-05-13 | 初版：与 `SearchClient`、`CandidateRetrieverService`、`RetrievalService` 实现对齐 |
