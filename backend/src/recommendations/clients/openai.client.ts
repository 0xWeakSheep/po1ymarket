/**
 * OpenAI 客户端
 * 
 * 功能：
 * 1. 打分候选链接
 * 2. 返回打分结果
 */

import { Inject, Injectable } from '@nestjs/common'

import { SETTINGS } from '../../common/constants'
import type { Settings } from '../../config/settings'
import { loadPromptMd } from '../../prompts/load-prompt-md'
import type { LlmClient, LlmScoreResult } from '../types/recommendations'

@Injectable()
export class OpenAiClient implements LlmClient {
  readonly enabled: boolean

  constructor (@Inject(SETTINGS) private readonly settings: Settings) {
    this.enabled = Boolean(this.settings.openaiApiKey && this.settings.llmRerankEnabled)
  }

  async scoreCandidate (input: {
    marketQuestion: string
    marketDescription?: string
    candidateTitle: string
    candidateSnippet?: string
    publishedAt?: string
  }): Promise<LlmScoreResult | null> {
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
              content: loadPromptMd('candidate-scoring.system')
            },
            {
              role: 'user',
              content: JSON.stringify({
                market_question: input.marketQuestion,
                ...(input.marketDescription !== undefined && {
                  market_description: input.marketDescription
                }),
                candidate_title: input.candidateTitle,
                ...(input.candidateSnippet !== undefined && {
                  candidate_snippet: input.candidateSnippet
                }),
                ...(input.publishedAt !== undefined && {
                  published_at: input.publishedAt
                }),
                task:
                  'Return JSON with relevance_score, freshness_score, ai_score, rationale. Scores must be numbers between 0 and 1.'
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

      if (!payload.output_text) {
        return null
      }

      return JSON.parse(payload.output_text) as LlmScoreResult
    } catch {
      return null
    } finally {
      clearTimeout(timeout)
    }
  }
}
