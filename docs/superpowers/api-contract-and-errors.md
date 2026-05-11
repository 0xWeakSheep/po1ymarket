# API 契约与错误沉淀（前后端协同）

> 最后更新：2026-05-11（Planner：Markdown 提示词 + Zod 输出校验）  
> 受众：人机协作者、`agent` 在改接口或消费接口前应读取本文。

## 治理目标

- **契约单一事实源**：请求/响应形状、字段名、可选扩展、错误语义在文档与代码中一致。  
- **错误可对流**：服务端失败原因可被前端/SDK 理解与展示（在不过度泄漏的前提下）。  
- **持续沉淀**：不是在「大功告成」时补文档，而在**每一次**相关改动中增量更新。

## Agent / 开发者必做清单（改 API 或改前端调用时）

1. **确认契约落点**
   - 推荐与 Query 预览相关：维护 `backend/src/recommendations/query/README.md`（含 **先读代码再改文档** 的维护纪律），并在 `backend/src/recommendations/types/recommendations.ts` 与后端 Controller 返回值对齐。  
   - Planner **提示词文件路径**以 `load-prompt-md.ts` 的 `PROMPT_MARKDOWN_SUBDIR` 与 `nest-cli.json` `assets` 为准；勿只改文档不改构建资源。  
   - 整条搜索/推荐链路概览：`docs/superpowers/search-current-state.md`（行为或瓶颈变化时必须更新）。
2. **字段与命名**
   - 对外 HTTP JSON 中与历史一致的部分保持 **snake_case**（如 `recommended_sources`、`planning_meta`、`fallback_reason`）。  
   - 前端 TypeScript 类型与运行时解析必须与上述一致（参见 `frontend/types/recommendation.ts`、`frontend/api/*`）。
3. **错误与诊断**
   - **HTTP 层**：`4xx/5xx`、Nest 异常体，`agent` 在文档中写明常见条件与前端如何展示（或映射为 `RecommendationsRunState.state === 'error'`）。  
   - **HTTP 200 但业务降级**：必须通过响应体承载结构化信息（例如 `planning_meta`：**`query_source`、`fallback_reason`、`message`、可选 `debug_detail`**），禁止仅依赖服务端 `console`。  
   - 新增/变更 `fallback_reason` 或 `planning_meta` 子字段：**同时**更新后端 README、本节「附录」摘录、前端类型与 Console/UI 文案（如有）。
4. **跨端一致性**
   - 同一字段在后端序列化名称、前端 `fetch` 解析、文档示例三处**逐字对齐**；删字段需标废弃期或一次性删除并写入迭代日志。
5. **迭代记录**
   - 凡动契约或错误语义：在 `docs/superpowers/search-iteration-log.md` 与（若涉及 UI）`docs/superpowers/frontend-iteration-log.md` **各追加一条**，写明：背景、契约 diff、前端影响、验证方式。

##「不断沉淀」的操作节奏建议

| 触发 | 动作 |
|------|------|
| 新增/变更路由或响应体 | 更新对应后端模块 README + `search-current-state.md`（若影响主链路） |
| 新增 Planner/召回/打分相关状态或错误码 | `planning_meta` 或与错误相关的类型 + 本节附录 + 迭代日志 |
| 仅服务端日志可看、前端看不懂 | **视为不完整**：补响应字段或文档中的「前端消费说明」 |

## 附录：`planning_meta` 当前约定（示例）

以下内容随实现演进；若与代码不一致，以 **`recommendations.ts` + `RecommendationsResponse`** 为准，并回本文件修正。

- **`planner_configured`**：`boolean`，环境是否配置了可用于 Planner 的密钥。  
- **`query_source`**：`'llm' \| 'rules'`。  
- **`fallback_reason`**（回退规则时）：`planner_disabled` | `llm_empty_content` | `llm_request_failed` | `payload_parse_failed` | `queries_sanitized_insufficient`。其中 `payload_parse_failed` 覆盖 **`JSON.parse` 失败** 与 **Planner 输出未通过 Zod strict 校验**（多余字段、类型错误、`confidence` 越界等）。  
- **`upstream_http_status` / `upstream_code`**：Planner HTTP 失败时可选。  
- **`message`**：简短、面向人的说明（不含密钥）。  
- **`debug_detail`**：仅当服务端 `PO1MARKET_QUERY_DEBUG=true` 时可能出现；可含 Planner HTTP 兜底说明、原始错误摘要、JSON 前缀，或 **Zod 校验问题摘要**（与 `backend/src/prompts/agent-prompt/query-planning.system.md` 及 `query-planning.schema` 对照排障）。

## Agent 自检句（可复制到任务末尾）

> 我已核对：后端 README / `search-current-state` / 迭代日志中与本次改动相关的段落已更新；`planning_meta`（或等价结构）前后端字段名一致；错误或降级路径在 200 响应体或 HTTP 语义中有据可查。
