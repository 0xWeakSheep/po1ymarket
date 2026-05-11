# po1ymarket (NestJS API)

Recommendation API for Polymarket-style markets: `POST /api/v1/recommendations`, `GET /health`, `GET /`.

This app is the **Node.js (NestJS)** recommendation API. Behavior and env vars follow the same `PO1MARKET_*` conventions as the legacy FastAPI stack; see `src/config/settings.ts`.

Environment variables use the `PO1MARKET_` prefix (same as the old Python stack). Notable:

- `PO1MARKET_REQUEST_TIMEOUT_SECONDS` — default `15` (matches Python `request_timeout_seconds`)
- `PO1MARKET_REQUEST_TIMEOUT_MS` — optional legacy fallback, converted to seconds for HTTP timeouts
- `PO1MARKET_CORS_ORIGIN` — comma-separated allowlist, or omit for permissive CORS in dev

Query planning LLM (uses the `openai` npm SDK → `chat.completions.create`):

- `PO1MARKET_DEEPSEEK_API_KEY` — if set, query planner uses DeepSeek with `baseURL` `PO1MARKET_DEEPSEEK_BASE_URL` (default `https://api.deepseek.com`), model `PO1MARKET_DEEPSEEK_MODEL` (default `deepseek-v4-flash`).
- Otherwise, if `PO1MARKET_OPENAI_API_KEY` is set, query planner uses OpenAI Responses API (`PO1MARKET_OPENAI_BASE_URL`). Candidate scoring still uses `OpenAiClient` + OpenAI vars.

## Commands

```bash
cd backend
npm install
npm run start:dev    # watch mode
npm run build
npm run start:prod   # node dist/main
npm test
docker build -t po1market-backend .
```

Default HTTP port: `3000` (override with `PORT`).

## Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | `{ root: true }` |
| GET | `/health` | `{ status: "ok" }` |
| POST | `/api/v1/recommendations` | Body: `market_id` and/or `market_question`, etc. Returns `{ recommended_sources: [...] }`. Status **200** (not 201). |

## GitHub Delivery

GitHub Actions workflows live in `.github/workflows/`:

- `backend-ci.yml` — install, test, build
- `backend-deploy.yml` — build, upload, and restart the service on a remote host over SSH with `pm2`

Deployment notes and required GitHub secrets are documented in `../deploy/README.md`.
