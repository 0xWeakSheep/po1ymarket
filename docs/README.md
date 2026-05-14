# 文档入口

本目录为仓库内 **设计与协作文档** 的根；业务代码旁的 `README.md`（如 `backend/src/recommendations/query/README.md`）仍与实现强绑定。

| 路径 | 用途 |
|------|------|
| [`frontend-user-guide.md`](./frontend-user-guide.md) | **前端使用手册**：页面入口、Query Console 操作、环境变量与联调、常见问题（与 `frontend/README.md` 对齐） |
| [`superpowers/README.md`](./superpowers/README.md) | 文档治理规则、前后端分治、迭代日志与契约入口 |
| [`superpowers/api-contract-and-errors.md`](./superpowers/api-contract-and-errors.md) | API 契约、`planning_meta`、错误语义（改接口必读） |
| [`superpowers/specs/`](./superpowers/specs/) | 设计规格（retrieval 缓存、scoring roadmap 等） |
| [`superpowers/plans/`](./superpowers/plans/) | 实施计划草案 |
| [`../backend/src/recommendations/retrieval/SEARCH-IO.md`](../backend/src/recommendations/retrieval/SEARCH-IO.md) | 搜索 / 多源召回 **参数与接口约定**（实现侧） |

根目录另有：`fastcontribute.md`、`git-collaboration.md`、`task-board.md`（协作与任务看板）。

**前端 Agent**：必读 `frontend/AGENTS.md`（含 API 契约与文档索引）。
