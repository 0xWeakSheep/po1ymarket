import type { RecommendationRequest } from '../../recommendations/types/recommendations'

export type CacheScope = 'recommendations' | 'queries'

export function buildCacheKey (
  scope: CacheScope,
  request: RecommendationRequest
): string {
  return `${scope}:${stableStringify({
    market_id: request.market_id?.trim() || undefined,
    polymarket_market_id: request.polymarket_market_id?.trim() || undefined,
    polymarket_market_slug: request.polymarket_market_slug?.trim() || undefined,
    polymarket_event_slug: request.polymarket_event_slug?.trim() || undefined,
    market_question: request.market_question?.trim() || undefined,
    market_description: request.market_description?.trim() || undefined,
    resolution_source: request.resolution_source?.trim() || undefined,
    max_results: request.max_results,
    candidate_limit: request.candidate_limit,
    include_rejected: request.include_rejected
  })}`
}

function stableStringify (value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))

    return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(',')}}`
  }

  return JSON.stringify(value)
}
