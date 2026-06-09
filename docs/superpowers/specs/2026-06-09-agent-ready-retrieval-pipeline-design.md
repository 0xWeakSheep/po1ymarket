# Agent-ready Retrieval Pipeline Design

> Date: 2026-06-09
> Scope: `market -> query -> retrieval -> scoring -> recommended_sources`

## 1. Purpose

The first milestone is not a full RAG answer generator. The goal is to make the current recommendation pipeline clear, observable, and ready for an agent to consume.

The pipeline should answer three questions at every stage:

1. What did this stage receive?
2. What did this stage output?
3. If the final result is poor, how do we know which stage failed?

This design is especially meant to support contributors who come from frontend development and want to build agent development experience. The system should be easy to explain as a retrieval pipeline before it becomes a full evidence-analysis agent.

## 2. Current Baseline

The repository already has the core backend chain:

```txt
RecommendationsService.recommend
  -> normalizeRequest
  -> RetrievalService.retrieve
       -> QueryService.resolveMarketContext
       -> CandidateRetrieverService.retrieve
            -> SearchClient.gatherCandidates
  -> ScoringService.scoreCandidates
  -> recommended_sources
```

Current strengths:

- Query planning supports LLM-first output with rules fallback.
- Retrieval already collects candidates from Polymarket official source, Google News, and Reddit.
- Retrieval provider diagnostics are already included in `retrieval_meta`.
- Scoring already computes relevance, freshness, optional LLM score, `totalScore`, and stale filtering.

Current gaps:

- The response hides useful scoring details because `recommended_sources[].score` is still a placeholder `0`.
- The API does not expose enough stage-level metadata to explain the full chain.
- Market input resolution is not surfaced as a first-class meta object.
- Scoring output and stale filtering are not easy to debug from the client side.
- The system is retrieval-ready, but not yet agent-ready as an explainable pipeline.

## 3. Non-goals For This Milestone

This milestone deliberately does not include:

- Embeddings or vector databases.
- Webpage body fetching, chunking, or long-context synthesis.
- A final natural-language market analysis answer.
- Multi-turn self-reflective retrieval.
- A separate fetch service.
- Letting an LLM directly execute external provider calls.
- Broad provider expansion.

Those can be added later. First, the existing chain should become reliable, inspectable, and teachable.

## 4. Pipeline Contract

The intended conceptual contract is:

```txt
market
  -> query
  -> retrieval
  -> scoring
  -> recommended_sources
```

Each stage owns one decision:

| Stage | Question answered | Owner |
| --- | --- | --- |
| Market | What market is the user asking about? | `QueryMarketProvider` / market resolution |
| Query | What should we search for? | `QueryService` / planner or rules |
| Retrieval | Where did we search and what did we find? | `CandidateRetrieverService` / `SearchClient` |
| Scoring | Which candidates are useful enough to keep? | `ScoringService` |
| Recommended sources | What should the agent or UI consume? | `RecommendationsService` |

## 5. Market Stage

### Responsibility

Normalize user input into a `MarketContext` that downstream stages can use.

Supported input sources:

- `polymarket_market_id`
- `polymarket_market_slug`
- `polymarket_event_slug`
- legacy `market_id`
- custom `market_question`

### Proposed metadata

Add a `market_meta` object to the recommendation response and, where practical, to the internal `MarketContext`.

```ts
type MarketMeta = {
  input_type:
    | 'polymarket_market_id'
    | 'polymarket_market_slug'
    | 'polymarket_event_slug'
    | 'legacy_market_id'
    | 'market_question'
  resolved_from_polymarket: boolean
  fallback_used?: boolean
}
```

### Debug value

If the final recommendation is weak, this tells us whether the system started from a resolved Polymarket market or from plain user text.

## 6. Query Stage

### Responsibility

Decide what to search for.

The current LLM-first, rules-fallback behavior should stay. The milestone should not add complex planner fields such as entity tags or intent tags yet.

### Current metadata to preserve

`planning_meta` remains the primary query-stage diagnostic object:

```ts
type QueryPlanningMeta = {
  planner_configured: boolean
  query_source: 'llm' | 'rules'
  fallback_reason?: QueryPlanningFallbackReason
  upstream_http_status?: number
  upstream_code?: string
  message?: string
  debug_detail?: string
}
```

### Proposed metadata

Add a lightweight `query_meta` object:

```ts
type QueryMeta = {
  query_count: number
  primary_query: string
  variants: string[]
}
```

This can be derived from the final `searchQueries`, so it does not need to broaden the LLM planner schema.

### Debug value

If retrieval returns poor candidates, this tells us whether the problem is likely query quality or provider coverage.

## 7. Retrieval Stage

### Responsibility

Execute provider search and return a candidate pool.

The first milestone keeps the current fixed strategy:

```txt
for each query:
  search Google News
  search Reddit
also include official resolution source when available
```

### Current metadata to preserve

The existing provider diagnostics should stay:

```ts
type RetrievalProviderDebug = {
  provider: string
  query_count: number
  candidate_count: number
  failed_query_count: number
  failure_reasons?: string[]
}
```

### Proposed metadata additions

Extend `retrieval_meta` with strategy-level fields:

```ts
type RetrievalMeta = {
  strategy: 'fixed_provider_mix'
  candidate_limit: number
  query_count: number
  providers: RetrievalProviderDebug[]
  total_candidates_before_scoring: number
  total_candidates_after_scoring?: number
  stale_filtered_count?: number
}
```

### Debug value

If there are no final sources, this makes it clear whether retrieval found nothing or scoring filtered everything.

## 8. Scoring Stage

### Responsibility

Rank candidates and filter unsuitable results.

The current scoring model can remain for this milestone:

- Heuristic relevance.
- Heuristic freshness.
- Default `aiScore`.
- Optional per-candidate LLM rerank.
- Stale filtering.

The key change is to expose enough scoring output for users, agents, and frontend debugging.

### Proposed recommended source output

Replace the placeholder score in `recommended_sources` with the actual score and minimal source context:

```ts
type RecommendedSource = {
  url: string
  score: number
  title?: string
  provider?: string
  source_type?: SourceType
  rationale?: string
  debug_score?: CandidateScoreDebug
}

type CandidateScoreDebug = {
  relevance_score: number
  freshness_score: number
  ai_score: number
  total_score: number
  stale: boolean
  stale_reason?: string
}
```

`debug_score` should only be included when the backend is in debug mode or when a future request flag explicitly asks for diagnostics.

### Proposed scoring metadata

Add `scoring_meta`:

```ts
type ScoringMeta = {
  scored_count: number
  returned_count: number
  stale_filtered_count: number
  llm_rerank_enabled: boolean
}
```

### Debug value

This stage becomes explainable without reading server logs. A frontend developer or agent can see why a source ranked high or disappeared.

## 9. Response Shape

The recommendation response should become:

```ts
type RecommendationResponse = {
  recommended_sources: RecommendedSource[]
  market_meta?: MarketMeta
  planning_meta?: QueryPlanningMeta
  query_meta?: QueryMeta
  retrieval_meta?: RetrievalMeta
  scoring_meta?: ScoringMeta
}
```

`recommended_sources` stays compact enough for agent consumption. The meta objects explain the pipeline.

## 10. Error And Fallback Principles

The system should prefer graceful degradation:

- Planner failure falls back to rules.
- Provider failure records provider-level failure reasons but does not fail the full request when other sources exist.
- LLM rerank failure falls back to heuristic scoring.
- Metadata should explain fallback paths in the HTTP response when safe to expose.

Production responses should avoid leaking raw upstream payloads, secrets, or long error bodies. Debug fields should remain bounded and sanitized.

## 11. Testing Strategy

Implementation should add or update tests at the same boundaries as the pipeline:

1. Market resolution tests verify `market_meta` for each input style.
2. Query tests verify `query_meta` derived from LLM and fallback outputs.
3. Retrieval tests verify `strategy`, `candidate_limit`, provider counts, and failure counters.
4. Scoring tests verify actual `recommended_sources[].score`, title/provider/source fields, stale filtering, and `scoring_meta`.
5. E2E tests verify the full response shape for `POST /api/v1/recommendations`.

The strongest single regression test is a no-network service-level test where query, retrieval, and scoring dependencies are stubbed, proving that `RecommendationsService` assembles a fully explainable response.

## 12. Learning Path For Agent Development

For a frontend developer moving into agent work, this milestone creates a clear learning map:

1. Understand typed boundaries between stages.
2. Learn how LLM output is constrained and validated.
3. Learn how retrieval failures are represented without breaking the whole request.
4. Learn how ranking and filtering decisions become agent-consumable metadata.
5. Later, add skills that call the API, inspect sources, and synthesize final analysis.

This is the bridge from frontend/API work to agent/RAG engineering.

## 13. Implementation Order

Recommended order:

1. Update response and meta types.
2. Add `market_meta` and `query_meta`.
3. Extend `retrieval_meta` with strategy and candidate limit.
4. Return real scores and source context in `recommended_sources`.
5. Add `scoring_meta` and optional `debug_score`.
6. Update backend docs and frontend types.
7. Add focused unit tests and one full response-shape test.

This keeps behavior stable while improving explainability.

## 14. Acceptance Criteria

After this milestone, one recommendation request should allow a developer to explain:

- What market input was used and whether it resolved through Polymarket.
- Which search queries were generated and whether they came from LLM or rules.
- Which providers were searched and how many candidates each produced.
- How many candidates were scored.
- How many candidates were filtered as stale.
- Why each returned source was ranked where it was.
- What source objects an agent should consume next.

The chain is complete when this explanation can be made from the HTTP response and tests, without reading server logs.
