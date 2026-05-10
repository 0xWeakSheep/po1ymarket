# Search 现状基线文档（持续更新）

> 最后更新：2026-05-10  
> 维护目标：作为“搜索能力演进”的单一事实源（Single Source of Truth），后续每次改动都在此文档增量更新。

关联迭代记录：`docs/superpowers/search-iteration-log.md`

## 1. 产品目标与当前定位

- 当前产品目标：输入 `market_id` 或 `market_question`，返回可用于后续 agent 分析的候选信息源链接。
- 当前能力定位：已具备可用的推荐链路，但仍属于规则驱动检索 + 规则/LLM 混合打分阶段。
- 当前主优先级（团队口径）：提升检索准确率，其次再做体验与工程化增强。

## 2. 当前搜索主链路（后端）

主入口：`POST /api/v1/recommendations`

链路顺序：

1. `RecommendationsService.recommend` 标准化请求与默认参数
2. `RetrievalService.retrieve` 串联 query planning 与 candidate retrieval
3. `QueryService.resolveMarketContext` 解析市场上下文并生成搜索查询词
4. `SearchClient.gatherCandidates` 按 query 拉取候选源
5. `ScoringService.scoreCandidates` 进行规则分 + 可选 LLM 分
6. 过滤 stale，截断为 `max_results`，返回 `recommended_sources`

## 3. 模块现状（按职责）

### 3.1 Query 生成：`backend/src/recommendations/query/domain/query.service.ts`

- 当前策略：已拆分为独立 QueryService，对外提供 query 预览接口，内部仍采用规则生成，多数情况下产出 2~4 条 query。
- 关键行为：
  - 目录治理采用三层：`query/api`（功能接口）、`query/domain`（业务编排）、`query/integration`（提供方整合）；
  - `query-builder.ts` 已迁移至 `query/domain/query-builder.ts`，与 QueryService 共同归属业务层；
  - 新增 `POST /api/v1/search/queries`，支持基于 `market_id` 或 `market_question` 返回 `searchQueries`；
  - `MarketContextResolverService` 改为复用 `QueryService.buildQueries`，避免 query 逻辑散落在 resolver；
  - `normalizeWhitespace` 做空白归一；
  - `extractFocusClause` 基于 `before/after/by/if/unless/until` 截取主干；
  - 移除停用词后取前 6 个 token 形成 key phrase；
  - 若存在 `resolutionSource`，追加 `"<focus> official source"`。
- 已知限制：
  - 缺少语义改写（同义词、实体扩展、时间表达转换）；
  - 无基于首轮结果的二次改写机制；
  - 对复杂长问句和多条件问题鲁棒性一般。

### 3.2 候选召回：`backend/src/recommendations/retrieval/integration/search.client.ts`

- 当前 provider：
  - Polymarket 官方 `resolutionSource`（若为 URL，直接入候选）；
  - Google News RSS；
  - Reddit search。
- 当前策略：
  - 对每条 query 固定调用 `Google News + Reddit`；
  - `candidateLimit` 按 query 数量均分预算；
  - 最后按 URL 去重并截断。
- 已知限制：
  - provider 固定，不能按问题类型自适应；
  - 预算分配静态，无法动态加深高价值 query；
  - 网络错误吞掉后回空结果，不利于诊断召回损失。

### 3.3 候选打分与过滤：`backend/src/recommendations/scoring.service.ts`

- 当前打分：
  - `relevanceScore`：词项重叠 + sourceType 偏置；
  - `freshnessScore`：基于发布时间与 `inferUrgency` 衰减；
  - `aiScore`：可选 OpenAI 打分补充；
  - `totalScore`：按权重合成（relevance/freshness/ai）。
- 当前过滤：
  - `getStaleness` 对弱相关或过期候选做 stale 判定；
  - 非 stale 结果按总分排序后返回。
- 已知限制：
  - 候选间“证据冲突”缺乏交叉验证；
  - 单条打分为主，未形成多文档联合推理；
  - 返回层目前未透传完整分数细节到 API 响应。

### 3.4 响应组装：`backend/src/recommendations/recommendations.service.ts`

- 当前返回结构：`recommended_sources: [{ url, score }]`
- 现状注意：
  - 当前实现中 `score` 固定写为 `0`，未透传真实排序分值；
  - 对前端与调用方而言，可解释性和调试信息不足。

### 3.5 Recommendations 模块职责边界

- 模块定位：推荐结果编排层，不承载 query 规则细节；
- 核心职责：
  - 参数标准化；
  - 调用 Retrieval 层获取 `MarketContext` 与候选池；
  - 调用候选召回与打分；
  - 过滤后组装统一响应契约；
- 治理约束：`recommendations` 不再新增“市场上下文解析器”类，查询相关逻辑统一收口到 `retrieval` 层。

## 4. 前端消费现状

关键文件：`frontend/components/dashboard/QueryConsole.tsx`

- 已支持两种输入模式：`market-id` 与 `custom market question`；
- 可展示 loading / error / no-results / results 状态；
- 当前前端职责明确：不做业务排序逻辑，仅负责输入、调用、展示。

## 5. 准确率提升的核心瓶颈（当前阶段）

1. query 生成偏规则化，语义召回能力不稳定；
2. 召回阶段缺少动态检索编排；
3. 打分阶段缺少跨候选证据融合；
4. 响应层调试信息不足，难做“准确率问题定位”。

## 6. 与 Agent 方案的边界建议（用于后续迭代）

- 保留（确定性强）：
  - 参数校验、超时、去重、缓存、限流、API 契约。
- 优先交给 Agent（不确定性高）：
  - query planning（改写、扩展、优先级）；
  - retrieval orchestration（是否继续检索、换源、停止条件）；
  - evidence aggregation（冲突消解与最终推荐解释）。

## 7. 基线指标（从本周开始记录）

> 说明：本节先定义指标口径，数值可在后续迭代中补录。

- Query 有效率：至少命中 1 条高相关来源的请求占比
- Top-K 准确率：人工评审下 Top1/Top3 是否包含“可用于决议判断”的来源
- Freshness 合格率：时效型问题中，结果发布时间在有效窗口内的占比
- 无结果率：返回空结果的请求占比
- 可解释覆盖率：结果是否包含可读 rationale 的占比

## 8. 更新规范（开发过程中同步维护）

每次改动搜索相关逻辑后，必须更新以下三处：

1. 本文档的 `最后更新` 日期
2. 本文档底部“变更记录”新增 1 条
3. `task-board.md` 的 `Source Recommendation API` 中“当前进度/下一步”同步刷新
4. `docs/superpowers/search-iteration-log.md` 追加一条“迭代记录”

文件夹治理补充约束（搜索后端）：

- 功能接口层统一放在 `*/api`（Controller / DTO / Contract）；
- 业务层统一放在 `*/domain`（UseCase / Service / Rule）；
- 提供方整合层统一放在 `*/integration`（第三方 API、外部 provider 适配）；
- 禁止在 Controller 直接拼业务逻辑，禁止在 Domain 直接调用外部 provider 客户端。

建议在 PR 描述中附上：“已更新 `docs/superpowers/search-current-state.md`”。

## 9. 变更记录

### 2026-05-10

- 新建本文档，沉淀当前搜索链路事实基线；
- 明确 Query / Recall / Scoring / Response 四段职责与已知限制；
- 设定后续迭代的指标口径与文档更新规则。
- Query 模块拆分为独立 `QueryService`，并新增 query 预览接口 `POST /api/v1/search/queries`。
- Query 模块升级为文件夹治理拆分：`api/domain/integration` 三层。
- 推荐主链路改为直接调用 `QueryService.resolveMarketContext`，移除 `market-context.resolver`。
- SearchClient 迁移至 `retrieval/integration`，与查询层目录治理保持一致。
