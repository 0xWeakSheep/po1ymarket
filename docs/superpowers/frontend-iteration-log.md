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

### 2026-05-14 Query Console 中文体验与联调错误提示

- **背景**：`docs/README.md` 将 `docs/frontend-user-guide.md` 列为前端使用手册入口，但该文件此前缺失；工作台界面以英文为主，与文档中的中文协作描述不一致，且代理未配置时仅显示裸 404，不利于联调。
- **改动范围**：`frontend/components/dashboard/QueryConsole.tsx`、`WorkbenchGrid.tsx`、`app/dashboard/page.tsx`、`frontend/api/recommendations.ts`、新增 `frontend/utils/recommendationErrors.ts` 与 `frontend/constants/planningMeta.ts`、测试与 `docs/frontend-user-guide.md`。
- **实现要点**：Query Console 与仪表盘导航的主要文案改为中文；对同源 `/po1ymarket` 的 404 与典型网络失败附加 `BACKEND_PROXY_TARGET` / `NEXT_PUBLIC_API_BASE_URL` 操作指引；`fallback_reason` 展示与契约附录对齐的中文标签。
- **验证方式**：`cd frontend && npm run test`。
- **结果**：新协作者可按界面提示与使用手册完成 Nest 联调；契约字段仍与后端 snake_case 一致。
- **下一步**：若增加「一键检测后端连通性」等主动探测，再在本文追加记录。

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
