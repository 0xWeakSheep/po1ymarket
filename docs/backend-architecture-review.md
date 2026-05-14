# Backend Architecture Assessment (Maintainability & Extensibility)

Date: 2026-05-15
Audience: Backend developers
Scope: Entire backend (NestJS), with focus on recommendations pipeline

## 1) Executive summary

The backend is a focused NestJS service centered on the recommendations pipeline, with clear module boundaries in the query, retrieval, and scoring layers. The code is readable and already has a three-layer separation (api/domain/integration) inside the query module. However, the system still has several maintainability and extensibility risks: error handling is inconsistent across integrations, external calls are tightly coupled to concrete providers, and responses do not fully expose scoring or diagnostics needed for future evolution. The largest architectural improvement opportunity is to formalize module boundaries and contracts across the whole recommendations pipeline, standardize provider interfaces, and improve observability.

## 2) Current architecture overview

### 2.1 Modules and routing

- AppModule composes HealthModule and RecommendationsModule.
- Routes:
  - GET / -> { root: true }
  - GET /health -> { status: "ok" }
  - POST /api/v1/recommendations -> recommendations pipeline
  - POST /api/v1/search/queries -> query planning preview

### 2.2 Recommendations pipeline flow

1. Request normalization (RecommendationsService)
2. Query planning (QueryService; LLM first with rules fallback)
3. Candidate retrieval (SearchClient; Google News + Reddit + official)
4. Scoring (heuristic + optional LLM)
5. Filter stale and respond (only url + score placeholder)

### 2.3 Configuration

- Centralized via getSettings() with PO1MARKET_ prefix.
- LLM configuration supports DeepSeek and OpenAI with consistent Chat Completions usage.
- Request timeout is consistent across external calls.

## 3) Maintainability assessment

### Strengths

- Clear high-level module split: health vs recommendations.
- Query module has domain/integration split and test coverage context.
- Query planning has strict JSON parsing and safe fallback behavior.
- Prompt loading is centralized via Markdown assets.

### Weaknesses

- Retrieval and scoring modules are less structured than query; there is no explicit api/domain/integration layering across the entire pipeline.
- External provider error handling is inconsistent:
  - PolymarketClient throws structured exceptions.
  - SearchClient silently returns empty results on errors.
  - LLM client returns null on exceptions with no reason surfaced to upstream.
- Response schema hides scoring details (score is always 0), which blocks debugging and makes future changes hard to validate.
- Lack of shared interfaces or ports for external providers; SearchClient hardcodes Google News and Reddit.

## 4) Extensibility assessment

### Strengths

- Query planning already supports multiple LLM providers via config.
- Query preview endpoint enables iterative development without touching the full pipeline.

### Weaknesses

- Retrieval stage is tightly coupled to current providers; adding new sources requires editing SearchClient directly.
- No first-class plugin interface for providers, making experimentation costly.
- Scoring is sequential and per-candidate; future ranking strategies or batching would require refactoring core logic.
- No cache or orchestration layer to handle repeated retrievals.

## 5) Architectural risks and impact

- Silent failures in retrieval can lead to "empty results" without clear diagnosis.
- Current API response is not aligned with internal scoring logic, limiting observability and A/B testing.
- Coupling of provider-specific logic to SearchClient reduces reusability and makes scaling more difficult.

## 6) Recommended changes (prioritized)

### P0 (highest priority, low to medium effort)

1) Standardize error handling across integrations
- Introduce a shared error model (eg. IntegrationError with code, status, provider) and propagate minimal diagnostics via planning_meta or logs.
- Align SearchClient behavior with PolymarketClient (do not silently return empty results without trace).

2) Expose useful scoring in response
- Include totalScore and optional rationale in API response for debugging (guarded by config flag if needed).
- This makes the system testable and easier to evolve.

### P1 (medium priority)

3) Define provider interfaces and dependency injection for retrieval
- Introduce a ProviderPort interface, e.g. NewsProvider, SocialProvider, OfficialProvider.
- SearchClient becomes an orchestrator that aggregates providers.
- This reduces coupling and makes adding new sources easy.

4) Apply api/domain/integration layering across retrieval and scoring
- Mirror the query module structure across retrieval and scoring for consistency.
- Encourage clear separation of request DTOs, business logic, and provider clients.

### P2 (strategic)

5) Add retrieval cache layer
- Leverage the existing retrieval-cache design doc and implement a minimal in-memory or DB-backed cache.
- This improves latency, cost, and stability.

6) Batch or parallelize LLM scoring
- Current scoring is sequential and can be slow under load.
- Introduce bounded concurrency or batch scoring to keep throughput stable.

## 7) Suggested roadmap

Phase 1: Observability + contract alignment
- Standardize integration errors
- Add debug score fields to response

Phase 2: Extensible provider system
- Introduce provider interfaces
- Refactor SearchClient to orchestrate providers
- Add tests for provider orchestration

Phase 3: Performance and scalability
- Implement retrieval cache
- Add LLM scoring batching or concurrency limits

## 8) Open questions

- Should API response include full scoring by default or only in debug mode?
- Do we want provider-specific metrics or just aggregate stats?
- Should retrieval orchestration be rules-based or LLM-based in the medium term?

## 9) Appendix: key files

- backend/src/app.module.ts
- backend/src/recommendations/recommendations.service.ts
- backend/src/recommendations/retrieval/integration/search.client.ts
- backend/src/recommendations/scoring.service.ts
- backend/src/recommendations/query/domain/query.service.ts
- backend/src/config/settings.ts
