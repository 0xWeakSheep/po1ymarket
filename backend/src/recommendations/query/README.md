# Query 模块接口文档（临时）

> **维护纪律**：改 Planner 行为、提示词或对外契约时，先对照 **`integration/query-planning.client.ts`**、**`prompts/load-prompt-md.ts`**（及 `PROMPT_MARKDOWN_SUBDIR`）、**`nest-cli.json` 的 `assets`**、**`domain/query-planning.schema.ts`**，再改本文与 `docs/superpowers/*`、`task-board.md`，避免文档与运行时路径脱节。  
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

两处均走同一套 Chat Completions + `response_format: { type: 'json_object' }`。候选人打分仍只用 `OpenAiClient`（仍为 `fetch` 调 `/responses`，与 query 层独立）。

## 5. 与推荐主链路关系
- `RecommendationsService` 通过 `QueryService.resolveMarketContext` 获取市场上下文与搜索查询词
- **`POST /api/v1/recommendations` 响应体在 `recommended_sources` 之外附带 `planning_meta`（可选）**，与预览接口同形，便于前端展示「LLM / 规则」与回退原因
- `query` 模块接口可被前端/调试工具单独调用，不依赖完整推荐流程

## 6. Recommendations 模块功能（协同说明）

`recommendations` 模块聚焦“推荐结果编排”，主要职责：

- 标准化请求参数（默认值与边界校验）
- 调用 `query` 模块产出 `MarketContext`
- 调用 `search` 候选召回
- 调用 `scoring` 完成打分与 stale 过滤
- 组装 `recommended_sources` 响应
