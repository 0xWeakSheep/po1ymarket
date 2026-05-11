/**
 * Planner（Agent）返回 JSON 的解析与校验：先用 JSON.parse，再用 Zod 校验契约。
 */

import { z } from 'zod'

import type { QueryPlanPayload } from '../../types/recommendations'

/** 与 Planner system prompt / `QueryPlanPayload` 对齐；`.strict()` 拒绝多余字段，避免静默吞掉畸形结构。 */
export const queryPlanPayloadSchema = z
  .object({
    primary_query: z
      .string()
      .refine((s) => /\S/.test(s), '必须包含非空白字符'),
    variants: z.array(z.string()).max(32).optional(),
    confidence: z.number().min(0).max(1).optional()
  })
  .strict()

export class QueryPlanPayloadParseError extends Error {
  constructor (
    readonly code: 'invalid_json' | 'schema_violation',
    readonly zodIssues?: z.ZodIssue[]
  ) {
    super(code)
    this.name = 'QueryPlanPayloadParseError'
  }
}

export function formatQueryPlanZodIssues (issues: z.ZodIssue[] | undefined): string {
  if (!issues?.length) return '未知校验错误'
  return issues
    .map((i) => {
      const p = i.path.length ? i.path.join('.') : '(root)'
      return `${p}: ${i.message}`
    })
    .join('; ')
}

export function parseQueryPlanPayload (raw: string): QueryPlanPayload {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new QueryPlanPayloadParseError('invalid_json')
  }

  const result = queryPlanPayloadSchema.safeParse(parsed)
  if (!result.success) {
    throw new QueryPlanPayloadParseError('schema_violation', result.error.issues)
  }

  return result.data
}

/**
 * 清洗查询规划模式
 *
 * 功能：
 * 1. 清洗查询规划模式
 * 2. 返回清洗后的查询规划模式
 */
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
