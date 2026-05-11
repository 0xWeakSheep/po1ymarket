# Backend Search 技术迭代记录

> 最后更新：2026-05-11  
> 用途：记录后端搜索链路的每次技术迭代，沉淀“做了什么、为什么做、结果如何、下一步是什么”。

## 1. 与现有文档关系

- 基线事实文档：`docs/superpowers/search-current-state.md`
- 文档治理导航：`docs/superpowers/README.md`
- 协作看板：`task-board.md`
- 本文档定位：只记录“迭代过程与结果”，不重复维护完整现状说明。

建议阅读顺序：

1. 先看 `search-current-state.md`（当前状态和问题）
2. 再看本文档（近期迭代和结果）
3. 最后看 `task-board.md`（任务状态和认领）

## 2. 迭代记录规范

每次搜索链路相关改动（含 query、recall、scoring、agent 接入）至少新增一条记录，按以下结构填写：

### [YYYY-MM-DD] [迭代标题]

- **背景**：本次要解决什么问题，触发原因是什么
- **改动范围**：涉及哪些文件/模块
- **实现要点**：核心方案和关键取舍
- **验证方式**：测试、手工验证、指标对比
- **结果**：达成了什么，未达成什么
- **风险与回滚**：潜在风险、回滚路径
- **下一步**：后续跟进项

## 3. 迭代记录

### 2026-05-11 Query LLM Planner 第一阶段接入（无灰度）

- **背景**：Query 模块已完成服务化拆分，但查询构建仍以规则为主。需要在不改变主链路契约前提下引入单阶段 LLM 规划，并确保失败可无损降级。
- **改动范围**：
  - `backend/src/recommendations/query/domain/query-planning.schema.ts`
  - `backend/src/recommendations/query/domain/query-planning.spec.ts`
  - `backend/src/recommendations/query/integration/query-planning.client.ts`
  - `backend/src/recommendations/query/domain/query.service.ts`
  - `backend/src/recommendations/query/domain/query.service.spec.ts`
  - `backend/src/recommendations/recommendations.module.ts`
  - `backend/src/recommendations/types/recommendations.ts`
  - `backend/src/recommendations/query/README.md`
  - `docs/superpowers/search-current-state.md`
- **实现要点**：
  - 增加 `parseQueryPlanPayload` 与 `sanitizePlannedQueries`，将 LLM 输出统一为可控本地结构；
  - 新增 `QueryPlanningClient`，通过 `openai` SDK 调用 **`chat.completions.create`**（非 `/responses`），并在集成层处理 timeout / 空输出；
  - `QueryService.buildQueries` 改为异步编排：LLM 成功则返回清洗后结果，失败统一回退 `buildSearchQueries`；
  - 回退条件覆盖 invalid JSON、校验失败（后续在同日迭代为 **Zod strict**）、低产出（不足 2 条）等场景。
- **验证方式**：
  - `npm run test -- query/domain/query-planning.spec.ts query/domain/query.service.spec.ts query/domain/query-builder.spec.ts`
  - `npm test`
- **结果**：
  - Query LLM planner 最小可用路径已打通；
  - 回退链路保持稳定，主推荐接口契约未变；
  - 查询域相关测试与全量后端测试均通过。
- **风险与回滚**：
  - 风险：planner prompt 与 schema 仍较简化，复杂语义场景命中质量可能波动；
  - 回滚：关闭 `QueryPlanningClient`（无 key 或返回空）即可自动回到 legacy query-builder。
- **下一步**：（已由同后续迭代部分落实）`planning_meta`、`/search/queries` e2e、prompt 与契约持续迭代。

### 2026-05-11（续）Planner 提示词 Markdown 化 + Zod strict 输出契约

- **背景**：提示词需可由非研发直接维护；Planner 输出需与运行时校验一致，减少「多键/错型」静默失败。
- **改动范围**：`backend/src/prompts/agent-prompt/*`、`backend/src/prompts/load-prompt-md.ts`、`backend/nest-cli.json`、`backend/src/recommendations/query/domain/query-planning.schema.ts`、`backend/src/recommendations/types/recommendations.ts`、`backend/README.md`、`backend/src/recommendations/query/README.md`、`docs/superpowers/**`、`docs/superpowers/plans/**`、`docs/superpowers/specs/**`、`task-board.md`、根 `README.md`
- **实现要点**：System 文案用 `.md` 收集，构建拷贝入 `dist`；`queryPlanPayloadSchema` 使用 Zod `.strict()`，仅允许三键；移除此前「模块级 Prompts DI」复杂形态，调用方直接 `loadPromptMd`。
- **验证方式**：`npm test`、`npm run build`
- **结果**：文档、契约与实现一致；Planner 仍为 Chat Completions；打分仍为 `/responses`。
- **风险与回滚**：运行时依赖 `dist/prompts/agent-prompt` 或 `cwd` 下源码路径；缺失文件会抛错——`load-prompt-md` 对 dist / src 双路径探测。
- **下一步**：按样本继续迭代 `query-planning.system.md`；可考虑 e2e 覆盖 `/search/queries`。

### 2026-05-11（路径）提示词目录与 loader / assets 对齐

- **背景**：阶段性文档写过 `prompts/md/`，与仓库采用的 **`prompts/agent-prompt/`** 不一致，易导致拷贝与运行时路径错位。
- **改动范围**：`load-prompt-md.ts`、`nest-cli.json`、`query/README`、`task-board`、`docs/superpowers/*`、根 `README`、`backend/README`。
- **实现要点**：以 `PROMPT_MARKDOWN_SUBDIR = 'agent-prompt'` 为单一常量；`nest-cli` assets 使用 `prompts/agent-prompt/*.md`。
- **验证方式**：`npm run build`（确认 `dist/prompts/agent-prompt/*.md`）、`npm test`。
- **结果**：源码、打包产物与文档同源。
- **下一步**：批量更新文档前**先核对**上述三处代码事实源。

### 2026-05-10 Query 模块服务化拆分（代码 + 接口）

- **背景**：查询构建逻辑此前耦合在 `MarketContextResolverService` 与 `query-builder` 调用点中，缺少独立服务边界和可单独调用接口，不利于后续 Agent 编排与调试。
- **改动范围**：
  - `backend/src/recommendations/query/domain/query.service.ts`
  - `backend/src/recommendations/query/api/query.controller.ts`
  - `backend/src/recommendations/query/integration/query-market.provider.ts`
  - `backend/src/recommendations/retrieval/domain/retrieval.service.ts`
  - `backend/src/recommendations/retrieval/domain/candidate-retriever.service.ts`
  - `backend/src/recommendations/retrieval/integration/search.client.ts`
  - `backend/src/recommendations/recommendations.service.ts`
  - `backend/src/recommendations/recommendations.module.ts`
  - `backend/src/recommendations/clients/search.client.ts`
  - `backend/src/recommendations/retrieval/README.md`
  - `backend/src/recommendations/query/README.md`
  - `backend/src/recommendations/types/recommendations.ts`
  - `backend/src/recommendations/query/domain/query.service.spec.ts`
- **实现要点**：
  - 新增 `QueryService` 统一承载 query 逻辑：`buildQueries`（纯构建）+ `resolveQueries`（含 market 解析）；
  - 增加 `QueryService.resolveMarketContext`，由推荐主链路直接复用，移除 `market-context.resolver`；
  - 新增 `retrieval` 层，把 `query + search` 收口为统一服务（`RetrievalService`）；
  - `SearchClient` 从 `clients/` 迁移至 `retrieval/integration/`，实现查询层内部闭环；
  - 目录治理升级为 `api/domain/integration` 三层，分别承载功能接口、业务编排、提供方整合；
  - `query-builder.ts` 迁移至 `query/domain/query-builder.ts`，并同步迁移相关单测与引用路径；
  - 新增 `POST /api/v1/search/queries`，可独立输出 query 结果，作为后端查询能力接口；
  - 原推荐主链路改为复用 `QueryService`，实现“查询逻辑集中维护”。
- **验证方式**：
  - 运行 `npm run test -- query/domain/query-builder.spec.ts query/domain/query.service.spec.ts`；
  - 校验新增 QueryService 单测通过，原 query-builder 测试不回归。
- **结果**：
  - 查询能力已完成“代码拆分 + 功能接口拆分”；
  - 推荐主链路完成按功能模块收口，未改变现有 `/api/v1/recommendations` 入参契约。
- **风险与回滚**：
  - 风险：后续若 query 结构变化，需要同步 `QueryPreviewResponse` 与调用方解析；
  - 回滚：可移除 `QueryService/QueryController` 并恢复 resolver 内联构建（单文件回退路径清晰）。
- **下一步**：
  - 为 `POST /api/v1/search/queries` 增加 e2e 覆盖；
  - 将 query 输出接入前端调试面板，提升检索可解释性。

### 2026-05-10 文档体系初始化（现状基线 + 迭代日志）

- **背景**：搜索能力正在进入 Agent 化迭代阶段，需要先建立统一文档口径，避免开发过程中信息分散。
- **改动范围**：
  - `docs/superpowers/search-current-state.md`
  - `docs/superpowers/search-iteration-log.md`
  - `task-board.md`
- **实现要点**：
  - 新建搜索现状基线文档，沉淀 Query / Recall / Scoring / Response 四段现状；
  - 新建本迭代日志文档，定义统一记录模板和更新规则；
  - 在任务看板中增加文档入口，方便协作者定位。
- **验证方式**：
  - 人工检查文档入口是否互相可追踪；
  - 检查任务看板是否包含上述文档路径。
- **结果**：
  - 已形成“基线事实 + 迭代记录 + 任务看板”三层文档结构；
  - 后续技术变更可以按固定模板持续追加。
- **风险与回滚**：
  - 风险较低，主要为维护不及时导致信息滞后；
  - 如维护负担过高，可简化字段但保留最小记录（背景/改动/结果/下一步）。
- **下一步**：
  - 在每次搜索相关 PR 中强制追加一条迭代记录；
  - 进入 Agent Query 层接入前，先补第一批对比指标（有效率、Top-K、无结果率）。

## 4. PR 检查清单（搜索相关改动）

提交 PR 前，建议自检：

- [ ] 是否更新 `search-current-state.md` 的“最后更新”或关键现状描述
- [ ] 是否在本文档新增一条迭代记录
- [ ] 是否同步 `task-board.md` 的“当前进度/下一步”
- [ ] 是否在 PR 描述中附上文档更新说明
