import { Inject, Injectable } from '@nestjs/common'
import OpenAI from 'openai'

import { SETTINGS } from '../../../common/constants'
import type { Settings } from '../../../config/settings'
import type {
  QueryPlanningCallResult,
  QueryPlanningClientPort
} from '../../types/recommendations'

/** 从上游/ SDK 抛出物提取可序列化片段（不记录密钥）；用于日志与前端 debug_detail。 */
function extractPlannerCaughtFields (caught: unknown): {
  httpStatus?: number
  code?: string
  message: string
  name?: string
} {
  let httpStatus: number | undefined
  let code: string | undefined
  let message = ''
  let name: string | undefined

  if (typeof caught === 'object' && caught !== null) {
    const o = caught as {
      status?: number
      code?: string
      message?: string
      name?: string
      error?: { message?: string; code?: string; type?: string }
    }
    if (typeof o.status === 'number') httpStatus = o.status
    if (typeof o.code === 'string') code = o.code
    if (typeof o.message === 'string') message = o.message
    if (typeof o.name === 'string') name = o.name
    const nested = typeof o.error?.message === 'string' ? o.error.message : ''
    if (nested && !message) message = nested
  }
  if (caught instanceof Error) {
    if (!message) message = caught.message
    if (!name) name = caught.name
  }

  return { httpStatus, code, message, name }
}

function redactSecrets (s: string): string {
  return s
    .replace(/Bearer\s+[\w~._+/=-]+/gi, '[令牌已遮蔽]')
    .replace(/\bsk-[a-zA-Z0-9_-]{16,}\b/g, '[密钥已遮蔽]')
}

/** 对用户/契约暴露的简短说明（不含密钥、不附带长正文）。 */
function summarizePlannerFailureForApi (fields: {
  httpStatus?: number
  message: string
  name?: string
}): string {
  const { httpStatus, message, name } = fields

  if (httpStatus === 401 || httpStatus === 403) {
    return 'Planner 鉴权失败（401/403），请检查 API Key。'
  }
  if (httpStatus === 429) return 'Planner 请求被限流（429）。'
  if (typeof httpStatus === 'number' && httpStatus >= 500) {
    return `Planner 上游错误（HTTP ${httpStatus}）。`
  }
  if (httpStatus === 422 || httpStatus === 400) {
    return `Planner 请求被拒绝（HTTP ${httpStatus}）。`
  }
  const timeoutish =
    name === 'AbortError' || /timeout|aborted|timed out/i.test(`${name ?? ''} ${message}`)
  if (timeoutish) return 'Planner 超时或连接中断，可加大 PO1MARKET_REQUEST_TIMEOUT_SECONDS。'
  if (typeof httpStatus === 'number') {
    return `Planner 调用失败（HTTP ${httpStatus}）。`
  }
  return 'Planner 调用失败（未见 HTTP 状态，可能为网络或 SDK 异常）。'
}

@Injectable()
export class QueryPlanningClient implements QueryPlanningClientPort {
  readonly enabled: boolean

  constructor (@Inject(SETTINGS) private readonly settings: Settings) {
    const hasDeepseek = Boolean(this.settings.deepseekApiKey?.trim())
    const hasOpenai = Boolean(this.settings.openaiApiKey?.trim())
    this.enabled = hasDeepseek || hasOpenai
  }

  private plannerConsoleFailure (
    meta: { baseURL: string; model: string },
    caught: unknown
  ): void {
    if (!this.settings.queryDebugEnabled) return

    const fields = extractPlannerCaughtFields(caught)
    const reason =
      fields.httpStatus === 401 || fields.httpStatus === 403
        ? '鉴权失败（请检查 API Key；日志未打印密钥）'
        : fields.httpStatus === 429
          ? '限流或配额（429）'
          : typeof fields.httpStatus === 'number' && fields.httpStatus >= 500
            ? '上游 5xx 错误'
            : fields.httpStatus === 422 || fields.httpStatus === 400
              ? '请求被拒绝（参数/路由等，参见 detail）'
              : fields.name === 'AbortError' ||
                  /timeout|aborted|timed out/i.test(`${fields.name} ${fields.message}`)
                ? '超时或请求被中断（可与 requestTimeoutSeconds 对照）'
                : typeof fields.httpStatus === 'number'
                  ? `HTTP ${fields.httpStatus}`
                  : '未能归类（见 detail）'

    console.error('[query-plan]', 'Planner Chat Completions 失败，将走规则 fallback。', {
      baseURL: meta.baseURL,
      model: meta.model,
      httpStatus: fields.httpStatus,
      code: fields.code,
      reason,
      errorName: fields.name || undefined,
      detail: fields.message ? redactSecrets(fields.message).slice(0, 500) : undefined
    })
  }

  async planQueries (input: {
    question: string
    description?: string
    resolutionSource?: string
  }): Promise<QueryPlanningCallResult> {
    if (!this.enabled) {
      throw new Error('Invariant: QueryPlanningClient.planQueries 不得在 enabled=false 时调用')
    }

    const deepseekKey = this.settings.deepseekApiKey?.trim()
    if (deepseekKey) {
      return await this.planViaChatCompletions({
        apiKey: deepseekKey,
        baseURL: this.settings.deepseekBaseUrl,
        model: this.settings.deepseekModel,
        input
      })
    }

    const openaiKey = this.settings.openaiApiKey?.trim()
    if (openaiKey) {
      return await this.planViaChatCompletions({
        apiKey: openaiKey,
        baseURL: this.settings.openaiBaseUrl,
        model: this.settings.openaiModel,
        input
      })
    }

    throw new Error('Invariant: enabled=true 但未找到 DeepSeek/OpenAI Key')
  }

  private normalizeBase (url: string): string {
    return url.replace(/\/$/, '')
  }

  private buildMessages (input: {
    question: string
    description?: string
    resolutionSource?: string
  }): OpenAI.ChatCompletionMessageParam[] {
    return [
      {
        role: 'system',
        content: 'You generate concise web search queries for prediction market research. Reply with a single JSON object only: primary_query (string), variants (string array), confidence (number 0-1). No markdown, no code fences.'
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
  }

  /**
   * DeepSeek 与 OpenAI 均走 OpenAI 兼容的 Chat Completions（与官方 `openai` SDK 用法一致）。
   */
  private async planViaChatCompletions (options: {
    apiKey: string
    baseURL: string
    model: string
    input: {
      question: string
      description?: string
      resolutionSource?: string
    }
  }): Promise<QueryPlanningCallResult> {
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
        if (this.settings.queryDebugEnabled) {
          console.warn('[query-plan]', 'Chat Completions 返回空正文，将走规则 fallback（非网络异常）。', {
            baseURL: options.baseURL,
            model: options.model,
            choicesCount: completion.choices?.length ?? 0
          })
        }
        return { ok: false, reason: 'empty_content' }
      }

      return { ok: true, outputText: content }
    } catch (caught: unknown) {
      this.plannerConsoleFailure({ baseURL: options.baseURL, model: options.model }, caught)

      const fields = extractPlannerCaughtFields(caught)
      const rawDetail = fields.message ? redactSecrets(fields.message).slice(0, 600) : undefined
      const debugDetail = this.settings.queryDebugEnabled ? rawDetail : undefined

      return {
        ok: false,
        reason: 'request_failed',
        httpStatus: fields.httpStatus,
        code: fields.code,
        safeSummary: summarizePlannerFailureForApi(fields),
        debugDetail
      }
    }
  }
}
