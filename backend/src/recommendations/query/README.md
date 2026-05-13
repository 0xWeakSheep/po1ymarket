# Query 模块接口文档（临时）

> **维护纪律**：改 Planner 行为、提示词或对外契约时，先对照 **`integration/query-planning.client.ts`**、**`prompts/load-prompt-md.ts`**（及 `PROMPT_MARKDOWN_SUBDIR`）、**`nest-cli.json` 的 `assets`**、**`domain/query-planning.schema.ts`**，再改本文与 `docs/superpowers/*`、`task-board.md`，避免文档与运行时路径脱节。改 **候选人打分** 时另对照 **`../scoring.service.ts`**、**`../clients/openai.client.ts`**、**`candidate-scoring.system.md`**、**`../types/recommendations.ts`**（`LlmClient` / `LlmScoreResult`），并同步 §6.1 与 `backend/README.md` 摘要。  
> **前后端契约与错误（Agent 必读）**：`docs/superpowers/api-contract-and-errors.md`。凡改路由、响应体或 Planner 诊断字段，必须与该文档及本文同步更新。

## 1. 模块职责

`query` 模块负责“查询词生成（query planning）”能力，包括：

- 接收 `market_id` 或 `market_question`
- 解析市场问题上下文（必要时调用 Polymarket）
- 生成 `searchQueries` 供后续召回流程使用

## 2. 目录结构（治理约定）

- `api/`：功能接口层（Controller / DTO / Contract）
- `domain/`：业务层（Service / Rule / UseCase）
- `integration/`：提供方整合层（外部 Provider 适配）

当前对应文件：

- `api/query.controller.ts`
- `domain/query.service.ts`
- `domain/query-builder.ts`
- `integration/query-market.provider.ts`
- `integration/query-planning.client.ts`

**LLM 提示词（系统级文案，非 Nest 注入）**

- Planner system：`backend/src/prompts/agent-prompt/query-planning.system.md`（`QueryPlanningClient` → `loadPromptMd('query-planning.system')`）。
- 候选人打分 system：`backend/src/prompts/agent-prompt/candidate-scoring.system.md`（`OpenAiClient` → `loadPromptMd('candidate-scoring.system')`）。
- 构建期拷贝：`nest-cli.json` → `compilerOptions.assets` 含 `prompts/agent-prompt/*.md`，产物位于 `dist/prompts/agent-prompt/`（与 `load-prompt-md` 内 `__dirname` 拼接一致）。

## 3. 接口定义

### 3.1 生成查询词

- **Method**: `POST`
- **Path**: `/api/v1/search/queries`
- **Controller**: `QueryController.create`

请求体（`RecommendationRequest`）：

```json
{
  "market_id": "optional-string",
  "market_question": "optional-string",
  "market_description": "optional-string",
  "resolution_source": "optional-string"
}
```

约束：

- `market_id` 和 `market_question` 至少提供一个
- 若两者都缺失，返回 `400 Bad Request`

成功响应（`QueryPreviewResponse`）：

```json
{
  "question": "Will BTC close above 120k this month?",
  "description": "optional description",
  "resolutionSource": "https://example.com",
  "searchQueries": [
    "Will BTC close above 120k this month?",
    "BTC close above 120k",
    "BTC close above 120k official source"
  ],
  "planning_meta": {
    "planner_configured": true,
    "query_source": "llm",
    "message": "已采用 LLM 生成的检索词"
  }
}
```

`planning_meta` 说明（与 `POST /api/v1/recommendations` 响应中字段一致）：

- `planner_configured`：环境是否配置了可用于 Planner 的 API Key
- `query_source`：`llm` 或 `rules`（是否实际采用模型输出）
- `fallback_reason`：若回退规则，取 `planner_disabled` | `llm_empty_content` | `llm_request_failed` | `payload_parse_failed` | `queries_sanitized_insufficient`
- `upstream_http_status` / `upstream_code`：Planner HTTP 失败时可能有
- `message`：简短中文说明（不含密钥）
- `debug_detail`：仅当服务端 `PO1MARKET_QUERY_DEBUG=true` 时可能出现，供与终端日志对照

## 4. 内部流程（当前实现）

1. `QueryController` 接收请求并做基础参数校验
2. `QueryService.resolveQueries` 执行业务编排
3. `QueryMarketProvider.resolveQueryMarketInput` 获取标准化的 market 输入
4. `QueryService.buildQueries` 优先调用 `QueryPlanningClient`（单次 LLM，Chat Completions + `response_format: json_object`）
5. `query-planning.schema`：`JSON.parse` 后使用 **Zod** `queryPlanPayloadSchema`（`.strict()`，仅允许 `primary_query` / `variants` / `confidence`），再经 `sanitizePlannedQueries` 归一与去重
6. 任意异常（timeout/provider error/invalid json/**Zod 校验失败**/low yield）自动回退 `query-builder`
7. 返回 `QueryPreviewResponse`

## 4.1 LLM Planner 输出约束（当前）

`QueryPlanningClient` 使用官方 [`openai`](https://www.npmjs.com/package/openai) SDK 调用 **Chat Completions**，从 `choices[0].message.content` 取 **一段 JSON 文本**。允许字段（与 `queryPlanPayloadSchema.strict()` 一致）：

- `primary_query`: string（必填，且须含非空白字符）
- `variants`: string[]（可选，服务端还会做 `max(32)` 条数上限校验）
- `confidence`: number（可选，须在 `[0, 1]`）

本地始终进行：

- **Zod** 结构校验（多余键、类型错误、`confidence` 越界等一律 `payload_parse_failed` 回退）
- 文本标准化与去重（`sanitizePlannedQueries`）
- 数量裁剪（最多 6 条，清洗后有效条数 **少于 2** 则 `queries_sanitized_insufficient` 回退）

开启 `PO1MARKET_QUERY_DEBUG=true` 时，`planning_meta.debug_detail` 可包含 **`JSON.parse` 失败** 或 **Zod 报错摘要**（与 prompt 文件对照排障）。

## 4.2 模型提供方优先级

依赖：`backend/package.json` 中的 `openai` SDK。`QueryPlanningClient` 内 `new OpenAI({ apiKey, baseURL, timeout })`，再 `chat.completions.create(...)`。

环境变量（见 `backend/src/config/settings.ts`）：

| 优先级 | 条件 | 行为 |
|--------|------|------|
| 1 | `PO1MARKET_DEEPSEEK_API_KEY` 已设置 | `baseURL` = `PO1MARKET_DEEPSEEK_BASE_URL`（默认 `https://api.deepseek.com`），模型 `PO1MARKET_DEEPSEEK_MODEL` |
| 2 | 仅 `PO1MARKET_OPENAI_API_KEY` 已设置 | `baseURL` = `PO1MARKET_OPENAI_BASE_URL`（默认 `https://api.openai.com/v1`），模型 `PO1MARKET_OPENAI_MODEL` |

两处均走同一套 Chat Completions + `response_format: { type: 'json_object' }`。**候选人打分**同样走 `openai` SDK 的 **`chat.completions.create`**（`OpenAiClient`，与 Planner 同优先级：DeepSeek Key 优先，否则 OpenAI），**不再**使用 `/responses` 或独立 `fetch` 路径。

## 5. 与推荐主链路关系
- `RecommendationsService` 通过 `QueryService.resolveMarketContext` 获取市场上下文与搜索查询词
- **`POST /api/v1/recommendations` 响应体在 `recommended_sources` 之外附带 `planning_meta`（可选）**，与预览接口同形，便于前端展示「LLM / 规则」与回退原因
- `query` 模块接口可被前端/调试工具单独调用，不依赖完整推荐流程

## 6. Recommendations 模块功能（协同说明）

`recommendations` 模块聚焦“推荐结果编排”，主要职责：

- 标准化请求参数（默认值与边界校验）
- 调用 `query` 模块产出 `MarketContext`
- 调用 `search` 候选召回
- 调用 `scoring` 完成打分；**响应里剔除** `stale === true` 的候选后再截断 `max_results`
- 组装 `recommended_sources` 响应

### 6.1 Scoring / Rerank（与代码对齐，便于改 prompt 或阈值时自查）

实现入口：`backend/src/recommendations/scoring.service.ts`；LLM 客户端：`backend/src/recommendations/clients/openai.client.ts`；system 文案：`backend/src/prompts/agent-prompt/candidate-scoring.system.md`。

**单条候选处理顺序（当前）**

1. **启发式**：`relevanceScore`（市场/候选 token 交集比 + `sourceType` 加减分）、`freshnessScore`（无 `publishedAt` 时 official≈0.55 / 其它≈0.4；有日期则 `exp(-ageDays/inferUrgency)`，`inferUrgency` 见 `query/domain/query-builder.ts`）、`aiScore` 默认 0.5。
2. 算 **`totalScore`**：`relevance * 0.45 + freshness * 0.35 + ai * 0.20`；若 `stale` 再 **`total *= 0.4`**。
3. **`getStaleness`**：official 不标 stale；非 official 相关度过低或「发稿天数 > inferUrgency×3」则 stale（含 `staleReason`）。
4. **`PO1MARKET_LLM_RERANK_ENABLED` 且已配置 Key** 时，对每条候选 **串行** 调 `OpenAiClient.scoreCandidate`：user JSON 含 `market_*`、`candidate_*`、`published_at`、`candidate_source_type`（`news` | `social` | `official`）；成功则 **覆盖** relevance / freshness / `ai_score` 与 `rationale`，并 **重算** total 与 stale。
5. 全量按 `totalScore` 降序排序。

**`POST /api/v1/recommendations` 响应注意点**

- `recommended_sources` 里当前 **`score` 字段恒为 `0`**（占位），真实排序已由上述流程完成；调试可看服务端日志或后续若开放「调试字段」再透出。
- `planning_meta` 来自检索阶段解析的 `MarketContext`，与 query 预览接口同形。

**演进路线图（非代码契约）**：`docs/superpowers/specs/2026-05-13-scoring-rerank-roadmap.md`（启发式增强、并发/batch rerank、stale 改造、authority 维度等）。

**维护时**：改打分行为请同步本文、`backend/README.md`（若有摘要）、`task-board.md` 中与 scoring 相关的进度描述，以及 `candidate-scoring.system.md` 与 `LlmScoreResult` 类型（`types/recommendations.ts`）。
