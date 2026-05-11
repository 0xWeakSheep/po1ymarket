import { Inject, Injectable } from '@nestjs/common'

import { SETTINGS } from '../../../common/constants'
import type { Settings } from '../../../config/settings'
import type {
  QueryPlanningClientPort,
  QueryPlanningResult
} from '../../types/recommendations'

@Injectable()
export class QueryPlanningClient implements QueryPlanningClientPort {
  readonly enabled: boolean

  constructor (@Inject(SETTINGS) private readonly settings: Settings) {
    this.enabled = Boolean(this.settings.openaiApiKey)
  }

  async planQueries (input: {
    question: string
    description?: string
    resolutionSource?: string
  }): Promise<QueryPlanningResult | null> {
    if (!this.enabled || !this.settings.openaiApiKey) {
      return null
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.settings.requestTimeoutSeconds * 1000)

    try {
      const response = await fetch(`${this.settings.openaiBaseUrl.replace(/\/$/, '')}/responses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.settings.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.settings.openaiModel,
          input: [
            {
              role: 'system',
              content: 'You generate concise search queries for prediction market research. Return only JSON with primary_query, variants, confidence.'
            },
            {
              role: 'user',
              content: JSON.stringify({
                question: input.question,
                description: input.description,
                resolution_source: input.resolutionSource,
                max_queries: 6
              })
            }
          ]
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        return null
      }

      const payload = await response.json() as { output_text?: string }
      if (!payload.output_text?.trim()) {
        return null
      }

      return {
        outputText: payload.output_text
      }
    } catch {
      return null
    } finally {
      clearTimeout(timeout)
    }
  }
}
