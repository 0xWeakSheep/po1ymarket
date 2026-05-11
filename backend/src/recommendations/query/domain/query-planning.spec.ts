import {
  parseQueryPlanPayload,
  sanitizePlannedQueries
} from './query-planning.schema'

describe('query-planning.schema', () => {
  it('parses valid payload and keeps primary query', () => {
    const plan = parseQueryPlanPayload(JSON.stringify({
      primary_query: 'Will BTC close above 120k this month',
      variants: ['BTC price close above 120k May'],
      confidence: 0.86
    }))

    expect(plan.primary_query).toContain('BTC')
  })

  it('throws when payload is not valid JSON', () => {
    expect(() => parseQueryPlanPayload('not-json')).toThrow('invalid_json')
  })

  it('returns empty when all queries are invalid after sanitize', () => {
    const sanitized = sanitizePlannedQueries({
      primary_query: ' ',
      variants: [' ', '??'],
      confidence: 0.2
    }, 6)

    expect(sanitized.length).toBe(0)
  })
})
