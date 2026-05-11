# po1market

Applications in this repo:

- **`backend/`** — **NestJS recommendation API** — implements `POST /api/v1/recommendations` (scoring, data, validation).
- **`frontend/`** — **Next.js UI** — Query Console, layout, and browser `fetch` client only; see `frontend/README.md` for layout and backend vs frontend responsibilities.

## Documentation

- **`docs/superpowers/README.md`** — 技术文档治理入口（前后端分治；**API 契约与错误见 [`api-contract-and-errors.md`](./superpowers/api-contract-and-errors.md)**）
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

Use `frontend/.env.local` for local runs: see `frontend/.env.example`. By default the console calls `/po1ymarket` (rewrite to Nest via `BACKEND_PROXY_TARGET`). Optional `NEXT_PUBLIC_API_BASE_URL` overrides that for browser-direct debugging.
