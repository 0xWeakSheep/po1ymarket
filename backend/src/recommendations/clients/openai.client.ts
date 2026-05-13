/**
 * 候选人 LLM 打分客户端
 *
 * 与 Query Planner 一致：优先 DeepSeek（OpenAI 兼容 Chat Completions），否则 OpenAI。
 * 使用 `response_format: json_object`，不再调用 OpenAI 专有的 `/responses`。
 */

import { Inject, Injectable } from '@nestjs/common'
import OpenAI from 'openai'

import { SETTINGS } from '../../common/constants'
import type { Settings } from '../../config/settings'
import { loadPromptMd } from '../../prompts/load-prompt-md'
import type { LlmClient, LlmScoreResult, SourceType } from '../types/recommendations'

@Injectable()
export class OpenAiClient implements LlmClient {
  readonly enabled: boolean

  constructor (@Inject(SETTINGS) private readonly settings: Settings) {
    const hasDeepseek = Boolean(this.settings.deepseekApiKey?.trim())
    const hasOpenai = Boolean(this.settings.openaiApiKey?.trim())
    this.enabled = this.settings.llmRerankEnabled && (hasDeepseek || hasOpenai)
  }

  private normalizeBase (url: string): string {
    return url.replace(/\/$/, '')
  }

  // 生成 Chat Completions 消息，包含系统提示和用户输入
  private buildMessages (input: {
    marketQuestion: string
    marketDescription?: string
    candidateTitle: string
    candidateSnippet?: string
    publishedAt?: string
    sourceType: SourceType
  }): OpenAI.ChatCompletionMessageParam[] {
    return [
      { role: 'system', content: loadPromptMd('candidate-scoring.system') },
      {
        role: 'user',
        content: JSON.stringify({
          market_question: input.marketQuestion,
          ...(input.marketDescription !== undefined && {
            market_description: input.marketDescription
          }),
          candidate_title: input.candidateTitle,
          candidate_source_type: input.sourceType,
          ...(input.candidateSnippet !== undefined && {
            candidate_snippet: input.candidateSnippet
          }),
          ...(input.publishedAt !== undefined && {
            published_at: input.publishedAt
          }),
          task: 'score'
        })
      }
    ]
  }

  async scoreCandidate (input: {
    marketQuestion: string
    marketDescription?: string
    candidateTitle: string
    candidateSnippet?: string
    publishedAt?: string
    sourceType: SourceType
  }): Promise<LlmScoreResult | null> {
    if (!this.enabled) {
      return null
    }

    const deepseekKey = this.settings.deepseekApiKey?.trim()
    if (deepseekKey) {
      return await this.scoreViaChatCompletions({
        apiKey: deepseekKey,
        baseURL: this.settings.deepseekBaseUrl,
        model: this.settings.deepseekModel,
        input
      })
    }

    const openaiKey = this.settings.openaiApiKey?.trim()
    if (openaiKey) {
      return await this.scoreViaChatCompletions({
        apiKey: openaiKey,
        baseURL: this.settings.openaiBaseUrl,
        model: this.settings.openaiModel,
        input
      })
    }

    return null
  }

  private async scoreViaChatCompletions (options: {
    apiKey: string
    baseURL: string
    model: string
    input: {
      marketQuestion: string
      marketDescription?: string
      candidateTitle: string
      candidateSnippet?: string
      publishedAt?: string
      sourceType: SourceType
    }
  }): Promise<LlmScoreResult | null> {
    try {
      const client = new OpenAI({
        apiKey: options.apiKey,
        baseURL: this.normalizeBase(options.baseURL),
        timeout: this.settings.requestTimeoutSeconds * 1000
      })

      const completion = await client.chat.completions.create({
        model: options.model,
        messages: this.buildMessages(options.input),
        response_format: { type: 'json_object' },
        stream: false
      })

      const content = completion.choices[0]?.message?.content?.trim()
      if (!content) {
        return null
      }

      return JSON.parse(content) as LlmScoreResult
    } catch {
      return null
    }
  }
}
