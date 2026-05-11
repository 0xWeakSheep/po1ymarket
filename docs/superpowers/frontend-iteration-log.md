# Frontend 技术迭代记录

> 最后更新：2026-05-11  
> 用途：记录前端工作台（Query Console / 交互 / 展示 / 前端韧性）的技术迭代。

## 1. 适用范围

- `frontend/components/dashboard/`
- `frontend/api/`
- `frontend/tests/`
- 与后端接口契约相关的前端消费层改动

## 2. 迭代记录模板

### [YYYY-MM-DD] [迭代标题]

- **背景**
- **改动范围**
- **实现要点**
- **验证方式**
- **结果**
- **下一步**

## 3. 迭代记录

### 2026-05-11 后端契约对齐说明（前端消费 `planning_meta`）

- **背景**：后端已为 Query / 推荐响应补充 `planning_meta`（含降级原因与可选 `debug_detail`）；文档层需单点对齐全链路叙述。
- **改动范围**：主要在 **`docs/superpowers/`、`backend/*/README.md`、`task-board.md`**；前端代码若为既有 `planning_meta` 展示可不重复提交。
- **实现要点**：`api-contract-and-errors.md`、`search-current-state.md`、根 `README` 等对 **`planning_meta` 语义、Planner=Chat Completions vs 打分=`/responses`** 与 **Zod 校验** 的描述与后端一致。
- **验证方式**：人工通读 `QueryConsole` 与文档中的字段表是否一致。
- **结果**：协作者可从「任务看板 → 基线文档 → 契约附录」追踪 Query 可观测性。
- **下一步**：若 UI 增加 Planner 失败原因高亮，再在本文追加一条并附截图/组件路径。

### 2026-05-10 前端日志初始化

- **背景**：现有文档以后端搜索链路为主，前端迭代记录缺少统一入口。
- **改动范围**：
  - `docs/superpowers/frontend-iteration-log.md`
  - `docs/superpowers/README.md`
- **实现要点**：建立前端专属日志，和后端搜索日志分治维护。
- **验证方式**：人工检查入口是否可达、模板是否可复用。
- **结果**：前端迭代可独立沉淀，不再与后端搜索日志混写。
- **下一步**：将 Query Console 后续改造按模板持续追加记录。
