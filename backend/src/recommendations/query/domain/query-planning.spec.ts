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

  it('throws schema_violation when primary_query is missing', () => {
    expect(() =>
      parseQueryPlanPayload(JSON.stringify({ variants: ['a'] }))
    ).toThrow('schema_violation')
  })

  it('throws schema_violation when extra keys are present (strict)', () => {
    expect(() =>
      parseQueryPlanPayload(
        JSON.stringify({
          primary_query: 'valid query here',
          hint: 'not allowed'
        })
      )
    ).toThrow('schema_violation')
  })

  it('throws schema_violation when confidence is out of range', () => {
    expect(() =>
      parseQueryPlanPayload(
        JSON.stringify({ primary_query: 'ok', confidence: 1.5 })
      )
    ).toThrow('schema_violation')
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
