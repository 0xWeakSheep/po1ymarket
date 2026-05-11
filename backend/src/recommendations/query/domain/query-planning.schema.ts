import type { QueryPlanPayload } from '../../types/recommendations'

export function parseQueryPlanPayload (raw: string): QueryPlanPayload {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('invalid_json')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('schema_violation')
  }

  const payload = parsed as QueryPlanPayload

  if (typeof payload.primary_query !== 'string' || !payload.primary_query.trim()) {
    throw new Error('schema_violation')
  }

  if (payload.confidence !== undefined && (typeof payload.confidence !== 'number' || payload.confidence < 0 || payload.confidence > 1)) {
    throw new Error('schema_violation')
  }

  return payload
}

export function sanitizePlannedQueries (
  payload: QueryPlanPayload,
  maxQueries: number
): string[] {
  const values = [payload.primary_query, ...(payload.variants ?? [])]
  const seen = new Set<string>()
  const queries: string[] = []

  for (const value of values) {
    const normalized = value.trim().replace(/\s+/g, ' ')

    if (!normalized || normalized.length < 3 || normalized.length > 160) {
      continue
    }

    const key = normalized.toLowerCase()
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    queries.push(normalized)

    if (queries.length >= maxQueries) {
      break
    }
  }

  return queries
}
