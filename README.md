# po1market

Applications in this repo:

- **`backend/`** — **NestJS recommendation API** — implements `POST /api/v1/recommendations` (scoring, data, validation).
- **`frontend/`** — **Next.js UI** — Query Console, layout, and browser `fetch` client only; see `frontend/README.md` for layout and backend vs frontend responsibilities.

## Documentation

- **`docs/README.md`** — 文档总索引（superpowers、契约、检索 I/O 等）
- **`docs/frontend-user-guide.md`** — 前端工作台使用说明（路由、Query Console、`.env.local` 联调）
- **`backend/src/recommendations/query/README.md`** — Query 预览、`planning_meta`、`agent-prompt/*.md`；**§6.1** 为当前 **Scoring / Rerank** 与主链路对齐说明
- **`backend/src/recommendations/retrieval/SEARCH-IO.md`** — 搜索 / 多源召回层 **输入输出与扩展约定**（给其他同学实现检索）
- **`docs/superpowers/specs/2026-05-13-scoring-rerank-roadmap.md`** — 打分 / rerank 演进路线（与 §6.1 对照）
- **`docs/superpowers/search-current-state.md`** — 后端搜索现状基线
- **`docs/superpowers/search-iteration-log.md`** — 后端搜索迭代记录
- **`docs/superpowers/frontend-iteration-log.md`** — 前端迭代记录

## 职责划分（简表）

- **后端 (`backend/`)**：预测市场解析、来源推荐与返回 JSON 契约。
- **前端 (`frontend/`)**：表单、调用上述 API、展示结果；不内置业务打分或 mock 结果集。

## 本地一键开发（可选）

在项目根目录装依赖并联起 **Nest（默认读 `backend/.env` 里的 `PORT`）** 与 **Next**：

```bash
npm install
npm run install:all
npm run dev
```

等价于两个终端分别 `cd backend && npm run start:dev` 与 `cd frontend && npm run dev`。关进程时 `Ctrl+C` 会 `-k` 尽量同时结束两端。

仅用一端时：`npm run dev:backend` / `npm run dev:frontend`。日常更省事的做法是：**前端走 `/po1ymarket` 代理 + `BACKEND_PROXY_TARGET`**，避免浏览器直连 Nest 时再配 CORS（见 `frontend/.env.example`）。

## API (Nest)

```bash
cd backend
npm install
npm run start:dev
```

Port defaults to `3000` (set `PORT`). Env vars: `PO1MARKET_*` — see `backend/src/config/settings.ts` and `backend/README.md`.

Run tests:

```bash
cd backend
npm test
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Use `frontend/.env.local` for local runs: see `frontend/.env.example`. By default the console calls `/po1ymarket` (rewrite to Nest via `BACKEND_PROXY_TARGET`). Optional `NEXT_PUBLIC_API_BASE_URL` overrides that for browser-direct debugging. End-user oriented steps: **`docs/frontend-user-guide.md`**.
