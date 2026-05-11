# Query LLM 增强设计（准确率优先，单阶段）

> 日期：2026-05-10  
> **2026-05-11 对齐说明（以代码为准）**：Planner 输出已由 **Zod `.strict()`** 固定为仅 `primary_query`、`variants`、`confidence`；下列 JSON 示例中的 `intent_tags` / `entities` / `time_constraints` **未进入当前实现**。Planner 调用形态为 **`chat.completions.create`**（DeepSeek/OpenAI 兼容）+ `response_format: json_object`；system 文案维护于 **`backend/src/prompts/agent-prompt/query-planning.system.md`**（参阅 `load-prompt-md.ts` / `nest-cli.json` assets）。
> 范围：`query` 模块（`query/domain` + `query/integration`）  
> 目标：在不引入灰度发布的前提下，用单次 LLM 提升 query 语义质量，并确保失败可无损降级到现有规则构建器。

## 1. 背景与目标

当前 `query/domain/query-builder.ts` 主要是规则构建，优点是稳定、可控，短板是对复杂问题（长问句、多条件、时间表达）语义召回弱。  
本次方案将“用户语义识别”交给 LLM，但将“稳定性与可控性”保留在本地规则与校验层。

明确目标：

- 提升 query 有效率与 Top-K 准确率；
- 不引入二阶段 LLM 调用；
- 不做灰度发布；
- LLM 任意失败时，必须回退到当前规则版 query-builder。

## 2. 设计原则

- **单阶段 LLM**：一次调用完成 query planning，不做二次自重排。
- **强约束输出**：仅接受 JSON 结构化输出，禁止自由文本。
- **本地护栏优先**：schema 校验、清洗、去重、预算裁剪在本地完成。
- **失败即降级**：任何 LLM 异常都走 legacy query-builder。
- **接口兼容**：不破坏现有 `RecommendationsService` 与 `RetrievalService` 调用契约。

## 3. 模块与职责

### 3.1 QueryService（编排层）

在 `query/domain/query.service.ts` 中新增 LLM 规划编排：

- 构造 `LLMQueryPlanInput`（question、description、resolutionSource、maxQueries）；
- 调用 `QueryPlanningClient.planQueries(...)`（单次）；
- 执行本地 schema 校验与后处理；
- 失败时 fallback 到 `buildSearchQueries`（当前规则实现）。

### 3.2 QueryPlanningClient（集成层）

新增 `query/integration/query-planning.client.ts`（或同等命名）：

- 只负责调用 LLM provider 并返回原始文本；
- 内置请求超时控制；
- 不承担业务判定（避免“客户端写业务”）。

### 3.3 Query Builder（规则层）

保留 `query/domain/query-builder.ts` 作为降级主路径：

- `buildSearchQueries(...)` 继续保持可独立工作；
- 作为 LLM 失败、异常、低产出时的最终兜底。

## 4. LLM 输出契约（JSON Schema 语义）

期望输出结构（示意）：

```json
{
  "primary_query": "string",
  "variants": ["string"],
  "confidence": 0.0
}
```

（**未采纳的历史扩展草案**曾包含 `intent_tags` / `entities` / `time_constraints`，已不再出现在 runtime schema。）

本地校验要求（与实现对齐）：

- `primary_query`：非空白字符串；
- `variants`：可选字符串数组；条目与 `primary_query` 一并经 `sanitize`；清洗后有效条数 **不足 2** 则整条 Planner 路径 fallback；
- `confidence`：可选，`[0, 1]`；类型或范围错误视为 **校验失败 → fallback**（Zod strict）；
- **禁止额外顶层键**：多余字段一律判定失败并 fallback。

## 5. 运行时流程

1. 标准化输入（空白清洗等）；
2. 发起单次 LLM query planning；
3. 解析 JSON + schema 校验；
4. 本地后处理（去重、长度限制、数量裁剪）；
5. 产出最终 queries；
6. 若任一步失败，fallback 到 `buildSearchQueries(...)`；
7. 返回结果时附带 `planning_meta`（`query_source`、`fallback_reason` 等）。

## 6. 错误处理与降级策略（硬约束）

触发 fallback 的条件：

- LLM 超时；
- provider 返回错误；
- 返回非 JSON；
- schema 校验不通过；
- 后处理后 query 数量不足；
- 命中安全策略（异常字符、可疑注入片段）。

降级策略：

- 统一调用 legacy `buildSearchQueries`；
- 保证输出非空（除非输入本身为空或非法，仍由上游参数校验处理）；
- 在日志中记录 `fallback_reason`。

## 7. 测试策略（无灰度版本）

### 7.1 单元测试

- LLM 成功路径：输出可用 queries，且满足去重和数量约束；
- 各类失败路径：timeout / provider error / invalid JSON / schema violation / low-yield fallback；
- 复杂输入覆盖：长问句、多条件、时间表达、噪声字符。

### 7.2 服务层测试（QueryService）

- 开关开启时优先走 LLM；
- LLM 失败时自动走 legacy；
- 输出结构与调用方预期兼容。

### 7.3 集成测试

- `POST /api/v1/search/queries`：覆盖成功 + fallback 两条主路径；
- `POST /api/v1/recommendations`：验证主链路无回归（至少一条端到端样例）。

## 8. 最小可观测性

建议记录以下字段：

- `query_planning_source`: `llm` / `legacy`
- `query_planning_fallback_reason`: `timeout|provider_error|invalid_json|schema_violation|low_yield|safety`
- `query_count_final`
- `query_planning_latency_ms`

## 9. 验收标准

- LLM 失败不影响可用性（fallback 可用率 100%）；
- 主链路接口契约不变；
- query 有效率与 Top-K 准确率相对当前基线有提升；
- 无结果率不显著恶化；
- 测试覆盖成功路径 + 全部 fallback 路径。

## 10. 非目标（本轮不做）

- 不做二阶段 LLM（生成后再自重排）；
- 不做灰度发布、流量分配策略；
- 不在本轮引入新的搜索 provider；
- 不在本轮改造 scoring 主逻辑。

## 11. 实施顺序（建议）

1. 定义 `QueryPlanningClient` 与输出 schema；
2. 在 `QueryService` 接入 LLM 编排与 fallback；
3. 增加 query 层单测与接口集成测试；
4. 连通 `recommendations` 主链路回归验证；
5. 根据结果再迭代 prompt 与 schema 细节。
