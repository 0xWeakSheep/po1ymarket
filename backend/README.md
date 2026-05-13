# po1ymarket (NestJS API)

Recommendation API for Polymarket-style markets: `POST /api/v1/recommendations`, `GET /health`, `GET /`.

This app is the **Node.js (NestJS)** recommendation API. Behavior and env vars follow the same `PO1MARKET_*` conventions as the legacy FastAPI stack; see `src/config/settings.ts`.

Environment variables use the `PO1MARKET_` prefix (same as the old Python stack). Notable:

- `PO1MARKET_REQUEST_TIMEOUT_SECONDS` — default `15` (matches Python `request_timeout_seconds`)
- `PO1MARKET_REQUEST_TIMEOUT_MS` — optional legacy fallback, converted to seconds for HTTP timeouts
- `PO1MARKET_CORS_ORIGIN` — comma-separated allowlist, or omit for permissive CORS in dev

Query planning and candidate LLM scoring (official `openai` npm SDK → `chat.completions.create` + `response_format: { type: 'json_object' }`):

- `PO1MARKET_DEEPSEEK_API_KEY` — if set, **query planner** and **`OpenAiClient` scoring** use DeepSeek-compatible base URL `PO1MARKET_DEEPSEEK_BASE_URL` (default `https://api.deepseek.com`), model `PO1MARKET_DEEPSEEK_MODEL`.
- Otherwise, if `PO1MARKET_OPENAI_API_KEY` is set, both use OpenAI-compatible Chat Completions at `PO1MARKET_OPENAI_BASE_URL` / `PO1MARKET_OPENAI_MODEL`.
- **Candidate scoring** is gated by `PO1MARKET_LLM_RERANK_ENABLED` (default on; set to `false` to disable) and requires at least one of the API keys above (see `settings.ts`).

System prompts for Planner and scoring are Markdown under **`backend/src/prompts/agent-prompt/`** (see `load-prompt-md.ts`, `PROMPT_MARKDOWN_SUBDIR`; copied to `dist` on `nest build` via `nest-cli.json` assets).

### Scoring & rerank (short)

- **Heuristic first** (`scoring.service.ts`): relevance from token overlap + `sourceType` bumps; freshness from age + `inferUrgency(question)`; default `aiScore` 0.5; **weighted total** `0.45 / 0.35 / 0.20`; if **stale**, total **× 0.4**; then sort by total.
- **Optional LLM** (`OpenAiClient`): same SDK path as planner — **`chat.completions.create`** + `response_format: { type: 'json_object' }`, **one request per candidate** (sequential today). User payload includes `candidate_source_type` for prompt alignment with freshness defaults.
- **Response**: `RecommendationsService` **drops** candidates with `stale === true` before `max_results`; `recommended_sources[].score` is currently **always `0`** (placeholder).

Collaboration detail: `backend/src/recommendations/query/README.md` §6.1; roadmap: `docs/superpowers/specs/2026-05-13-scoring-rerank-roadmap.md`.

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
