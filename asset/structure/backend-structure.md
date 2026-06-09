# Backend Structure

## Goals

- Keep `backend/` as one build and deploy unit so existing CI/CD stays nearly unchanged.
- Expose the public API from the `infra` app on the current main port.
- Move recommendation execution behind an internal `query` service port.
- Cache repeated requests in MongoDB for a short window so identical market requests do not hit the query layer every time.

## Top-Level Layout

```text
backend/src/
  apps/
    infra/
      infra-app.module.ts
    query/
      main.ts
      query-app.module.ts
  infra/
    cache/
    query/
    recommendations/
    search/
    infra.module.ts
  recommendations/
    application/
    clients/
    query/
    retrieval/
    recommendations.module.ts
    recommendations.service.ts
    scoring.service.ts
  config/
  common/
  health/
  prompts/
  main.ts
```

## Runtime Split

### Infra app

- Public port: `PORT` (`3001` by default).
- Keeps current public routes:
  - `POST /api/v1/recommendations`
  - `POST /api/v1/search/queries`
- Responsibilities:
  - request validation
  - Mongo-backed short-term cache
  - forwarding cache misses to the internal query service
  - keeping CORS and public entry behavior stable

### Query app

- Internal port: `PO1MARKET_QUERY_SERVICE_PORT` (`3002` by default).
- Runs the existing recommendation business logic:
  - market context resolution
  - planner / fallback query generation
  - candidate retrieval
  - scoring / rerank

## Process Model

- `backend/src/main.ts` is now a launcher.
- The launcher starts the public Nest app and forks `dist/apps/query/main.js` as an internal child process.
- Deployment still starts a single `dist/main.js`, so PM2 and GitHub Actions do not need structural changes.

## Layers

### 1. `infra`

External-facing transport and infrastructure concerns.

- `infra/recommendations/*`
  - public recommendations endpoint
- `infra/search/*`
  - public query-preview endpoint
- `infra/query/query-service.client.ts`
  - HTTP client to the internal query app
- `infra/cache/*`
  - Mongo persistence and TTL-based request cache

### 2. `recommendations`

Business layer for recommendation generation.

- `application/`
  - request normalization
- `query/domain/`
  - query planning rules and orchestration
- `query/integration/`
  - market/provider/planner adapters
- `retrieval/domain/`
  - candidate retrieval orchestration
- `retrieval/integration/`
  - Google News / Reddit adapters
- `clients/`
  - upstream service clients such as Polymarket and OpenAI-compatible LLMs

## Cache Contract

- Cache backend: MongoDB collection `request_cache`
- Cache key: route scope + normalized request payload
- Current scopes:
  - `recommendations`
  - `queries`
- TTL control: `PO1MARKET_QUERY_CACHE_TTL_SECONDS`

Within the TTL window, the same request returns directly from Mongo and does not hit the internal query service.

## Environment Variables Added

- `PO1MARKET_QUERY_SERVICE_PORT`
- `PO1MARKET_QUERY_SERVICE_HOST`
- `PO1MARKET_QUERY_SERVICE_BASE_URL`
- `PO1MARKET_QUERY_CACHE_TTL_SECONDS`
- `PO1MARKET_MONGODB_URI`
- `PO1MARKET_MONGODB_DB_NAME`

## Suggested Next Layering

If you want to continue the refactor, the next clean split is:

1. `shared`
   - shared DTOs, config, HTTP helpers, and common error mapping
2. `contracts`
   - explicit internal API contracts between `infra` and `query`
3. `persistence`
   - if Mongo usage grows beyond request cache, split it out from `infra/cache`

Right now I did not force these extra layers, because they would increase churn without immediate value and would touch more of the current CI/CD surface.
