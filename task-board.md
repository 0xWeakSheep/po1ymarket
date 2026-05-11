# Task Board

## 用途

这份文档可以当作一个简化版的 Linear 面板来看。

目标只有两个：

1. 让所有人快速知道每个模块现在做到哪里了
2. 让新人知道哪些事情已经有人做，哪些还可以认领

建议大家每次开新分支或提 PR 前，先看一遍这个文档。

## 状态说明

- `Backlog`：已经确认要做，但还没开始
- `Todo`：可以开始认领
- `In Progress`：有人正在做
- `Review`：已经提交，等待 review 或验证
- `Done`：当前阶段已经完成
- `Later`：未来方向，不是当前主线

---

## 1. Source Recommendation API

### 模块目标

输入 `market_id` 或 `market_question`，返回一组适合 agent 后续分析的推荐链接。

### 当前状态

`In Progress`

### 当前进度

- 已有 NestJS 后端主接口：`POST /api/v1/recommendations`
- 已拆出 Query 独立服务：`QueryService`
- 已新增 Query 独立接口：`POST /api/v1/search/queries`
- Query 目录治理已落地：`query/api`（功能接口）+ `query/domain`（业务）+ `query/integration`（提供方整合）
- Query LLM Planner：`QueryService.buildQueries` **LLM 优先 + 规则 fallback**；实现为 **`openai` Chat Completions**（DeepSeek/OpenAI，见 `backend/README.md`）
- Planner **system** 文案：`backend/src/prompts/agent-prompt/query-planning.system.md`（`loadPromptMd`）；候选人打分：**`agent-prompt/candidate-scoring.system.md`**
- Planner 返回 JSON 经 **Zod `.strict()`**（`query-planning.schema.ts`），契约三键：`primary_query` / `variants` / `confidence`
- **`planning_meta`** 已在预览与推荐响应中透出（含 `fallback_reason`、`query_source`；`PO1MARKET_QUERY_DEBUG=true` 时可有 `debug_detail`）；前端 Query Console 已可做基础展示
- 已新增 Retrieval 层：统一串联 `query -> candidate pool`（`RetrievalService`）
- 推荐主链路已改为直接复用 `QueryService.resolveMarketContext`（移除 `market-context.resolver`）
- 已支持 `market_id` 和 `market_question` 两种入口
- 已打通主链路：
  `market -> query builder -> candidate search -> scoring -> recommended_sources`
- 已接入基础候选源：
  - Polymarket metadata
  - Google News
  - Reddit
- 已有基础打分：
  - relevance
  - freshness
  - optional AI rerank

### 下一步

- 为 `POST /api/v1/search/queries` 增加 e2e 验证
- 迭代 `query-planning.system.md` 与本站样本命中率（与 Zod 契约保持同步）
- 优化 query 生成策略（多轮 / 按源别称等，视产品优先级）
- 增加更多 source provider
- 提升时间敏感盘口的 freshness 判断
- 优化弱相关结果过滤
- 补更多测试样例

### 适合认领的任务

- 改 `query/domain/query-builder.ts`
- 加新的候选源
- 调整 scoring 阈值
- 补 query / scoring 测试

### 主要文件

- `/backend/src/recommendations/recommendations.service.ts`
- `/backend/src/recommendations/query/domain/query-builder.ts`
- `/backend/src/recommendations/query/api/query.controller.ts`
- `/backend/src/recommendations/query/domain/query.service.ts`
- `/backend/src/recommendations/query/integration/query-planning.client.ts`
- `/backend/src/recommendations/query/domain/query-planning.schema.ts`
- `/backend/src/prompts/agent-prompt/`、`/backend/src/prompts/load-prompt-md.ts`
- `/backend/src/recommendations/query/integration/query-market.provider.ts`
- `/backend/src/recommendations/retrieval/domain/retrieval.service.ts`
- `/backend/src/recommendations/retrieval/domain/candidate-retriever.service.ts`
- `/backend/src/recommendations/retrieval/integration/search.client.ts`
- `/backend/src/recommendations/scoring.service.ts`
- `/backend/src/recommendations/clients/polymarket.client.ts`
- `/docs/superpowers/api-contract-and-errors.md`（`planning_meta` 与降级语义）
- `/docs/superpowers/search-current-state.md`（搜索现状基线与演进记录）
- `/docs/superpowers/search-iteration-log.md`（技术迭代日志）
- `/docs/superpowers/frontend-iteration-log.md`（前端迭代日志）
- `/docs/superpowers/README.md`（文档治理入口：前后端分治）

### Owner

- 当前主线：Elemen
- 可协作：开放认领

---

## 2. Frontend Workbench

### 模块目标

给开发者或协作者一个最小可用的工作台，可以输入 `market_id` / `market_question`，直接查看推荐结果。

### 当前状态

`In Progress`

### 当前进度

- 已有 Next.js 前端
- 已有 Query Console
- 已能调用推荐 API 并展示结果
- 已有基础 landing / dashboard 页面
- 前端职责边界比较清楚：
  只做输入、调用、展示，不承担业务排序逻辑

### 下一步

- 提升调试可见性
- 改善结果展示信息密度
- 增强错误提示
- 补充对新人更友好的演示路径

### 适合认领的任务

- 改进结果展示
- 增加更清楚的 loading / error 状态
- 增加调试辅助信息
- 做更明确的 example flows

### 主要文件

- `/frontend/components/dashboard/QueryConsole.tsx`
- `/frontend/api/recommendations.ts`
- `/frontend/app/dashboard/page.tsx`

### Owner

- 当前主线：已有基础
- 可协作：开放认领

---

## 3. Skills / Agent Workflow

### 模块目标

定义 agent 什么时候调用推荐接口、怎么消费推荐结果、什么时候继续补查或停止。

### 当前状态

`Todo`

### 当前进度

- 已明确这是一个独立协作方向
- 已新增协作文档：
  - `/skills/co.md`
- 已初步整理新人应如何理解和编写 skills
- 已确定第一批适合新人做的是“小 skill”，不是“大而全 skill”

### 下一步

- 建立 `skills/` 下的示例 skill 骨架
- 确定第一批 skill 列表
- 定义统一的 output 结构
- 定义失败路径和 escalation 规则
- 建立 skill review 标准

### 适合认领的任务

- 新建 `fetch-market-sources` skill
- 新建 `triage-market-links` skill
- 新建 `summarize-market-evidence` skill
- 新建 `time-sensitive-market-check` skill
- 补 skill 模板与示例

### 主要文件

- `/skills/co.md`

### Owner

- 当前主线：你在管理方向
- 可协作：非常适合新人优先认领

---

## 4. Infra / DB / 并发控制

### 模块目标

让推荐链路在更高并发、更长周期协作下仍然稳定、可观测、可扩展。

### 当前状态

`Todo`

### 当前进度

- 方向已经明确
- 代码层面还没有展开成完整独立模块
- 当前更多是 MVP 阶段的直连实现

### 下一步

- 设计缓存层
- 设计候选源抓取并发模型
- 增加日志与可观测性
- 明确后续 DB schema 和数据流
- 明确限流 / 重试 / 超时策略

### 适合认领的任务

- 请求缓存
- source 抓取并发优化
- logging / metrics
- DB schema 草案
- timeout / retry 方案

### Owner

- 当前主线：待展开
- 可协作：偏后端工程同学可认领

---

## 5. Git / Collaboration Docs

### 模块目标

让多人协作时，分支、PR、commit、review 都尽量统一，减少混乱。

### 当前状态

`Done`

### 当前进度

- 已新增根目录 Git 协作文档
- 已明确：
  - 所有人基于 `main` 拉分支
  - 在个人分支开发
  - commit 尽量交给 AI
  - 通过 PR 合回 `main`
  - 不强推

### 主要文件

- `/git-collaboration.md`

### Owner

- 当前主线：已就绪

---

## 6. Contributor Onboarding Docs

### 模块目标

让新加入的协作者快速理解项目、模块边界和最适合下手的方向。

### 当前状态

`Done`

### 当前进度

- 已新增快速贡献文档
- 已明确项目目标、模块划分、适合的参与方向

### 主要文件

- `/fastcontribute.md`

### Owner

- 当前主线：已就绪

---

## 7. Oracle / Modeling

### 模块目标

把 Polymarket 当作现实世界信号源，用已有盘口和外部信息去建模还不存在的新盘口。

### 当前状态

`Later`

### 当前进度

- 已明确是项目第二阶段方向
- 当前没有在本仓库形成完整产品面

### 下一步

- 明确第一批建模问题类型
- 定义输入特征与信号来源
- 明确和当前推荐链接产品的关系

### Owner

- 当前主线：未来方向

---

## 当前优先级

如果按现在的阶段排优先级，建议是：

1. Source Recommendation API
2. Skills / Agent Workflow
3. Infra / DB / 并发控制
4. Frontend Workbench
5. Oracle / Modeling

## 认领规则

大家认领任务时，尽量按下面方式写：

- 模块：例如 `Skills / Agent Workflow`
- 任务：例如 `fetch-market-sources`
- 状态：`Todo -> In Progress`
- 分支：例如 `feat/fetch-market-sources-skill`

如果一个任务已经有人在做，就不要重复开做，先同步。

## 每周更新建议

建议至少每周更新一次这份文档，最少更新这几项：

1. 哪些模块状态变了
2. 哪些任务已经有人认领
3. 哪些任务已经进 review
4. 当前最优先的 1 到 3 件事是什么
