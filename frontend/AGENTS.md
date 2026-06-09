<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## 本仓库与后端的 API 协同

改 `frontend/api/*`、`frontend/types/*` 或与推荐 / Query 相关的 UI 时，须与 Nest 侧契约一致；**优先阅读**下面「Agent 必读」表中的契约与索引，再改代码。

## Agent 必读（相对仓库根或 `frontend/`）

路径均以 **从 `frontend/` 出发的 `../`** 书写，便于在 IDE 中跳转。

| 优先级 | 文档 | 何时读 |
|--------|------|--------|
| P0 | `../docs/README.md` | 文档总入口：契约、specs、检索 I/O 链到何处 |
| P0 | `../docs/superpowers/api-contract-and-errors.md` | 改 API 客户端、类型、`planning_meta` 展示、错误处理时 |
| P0 | `../docs/superpowers/README.md` | 改契约后需同步哪些迭代日志、分治规则 |
| P1 | `../backend/src/recommendations/query/README.md` | Query 预览接口、`planning_meta` 字段语义；**§6.1** 含当前打分、真实 `recommended_sources[].score`、source 上下文与 Debug 下 `debug_score` 等主链路事实 |
| P1 | `../backend/src/recommendations/retrieval/SEARCH-IO.md` | 若 UI 或类型假设「候选从哪来、有哪些字段」，与多源召回 I/O 对齐 |
| P2 | `../docs/superpowers/search-current-state.md` | 大改搜索相关交互前了解后端现状基线 |
| P2 | `../docs/superpowers/frontend-iteration-log.md` | 合入前按仓库规范追加前端迭代记录 |

**与实现强绑定的前端说明**：`frontend/README.md`（代理、职责边界）。

<!-- END:nextjs-agent-rules -->
