# po1market

Applications in this repo:

- **`backend/`** — **NestJS recommendation API** — implements `POST /api/v1/recommendations` (scoring, data, validation).
- **`frontend/`** — **Next.js UI** — Query Console, layout, and browser `fetch` client only; see `frontend/README.md` for layout and backend vs frontend responsibilities.

## 职责划分（简表）

- **后端 (`backend/`)**：预测市场解析、来源推荐与返回 JSON 契约。
- **前端 (`frontend/`)**：表单、调用上述 API、展示结果；不内置业务打分或 mock 结果集。

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
