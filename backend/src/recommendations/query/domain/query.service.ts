import { Inject, Injectable } from '@nestjs/common'

import { SETTINGS } from '../../../common/constants'
import type { Settings } from '../../../config/settings'
import type {
  MarketContext,
  QueryPlanningFallbackReason,
  QueryPlanningMeta,
  QueryPreviewResponse,
  RecommendationRequest
} from '../../types/recommendations'
import { buildSearchQueries } from './query-builder'
import {
  formatQueryPlanZodIssues,
  parseQueryPlanPayload,
  QueryPlanPayloadParseError,
  sanitizePlannedQueries
} from './query-planning.schema'
import { QueryMarketProvider } from '../integration/query-market.provider'
import { QueryPlanningClient } from '../integration/query-planning.client'

const DEFAULT_FALLBACK_MESSAGE: Record<QueryPlanningFallbackReason, string> = {
  planner_disabled: '未配置 LLM API Key，已使用规则生成检索词。',
  llm_empty_content: 'Planner 返回空内容，已使用规则生成检索词。',
  llm_request_failed: 'Planner 请求失败，已使用规则生成检索词。',
  payload_parse_failed: 'Planner 返回非预期 JSON，已使用规则生成检索词。',
  queries_sanitized_insufficient: '解析后检索词过少，已使用规则生成检索词。'
}

@Injectable()
export class QueryService {
  constructor (
    private readonly queryMarketProvider: QueryMarketProvider,
    private readonly queryPlanningClient: QueryPlanningClient,
    @Inject(SETTINGS) private readonly settings: Settings
  ) {}

  /**
   * 构建查询
   *
   * 输入：
   * 1. 问题
   * 2. 描述
   * 3. 官方来源
   *
   * 输出：
   * 1. 查询词列表
   */
  async buildQueries (input: {
    question: string
    description?: string
    resolutionSource?: string
  }): Promise<string[]> {
    const { searchQueries } = await this.planSearchQueries(input)
    return searchQueries
  }

  private async planSearchQueries (input: {
    question: string
    description?: string
    resolutionSource?: string
  }): Promise<{ searchQueries: string[]; planningMeta: QueryPlanningMeta }> {
    const plannerConfigured = this.queryPlanningClient.enabled

    const buildFallback = (
      reason: QueryPlanningFallbackReason,
      patch?: Partial<QueryPlanningMeta>
    ): { searchQueries: string[]; planningMeta: QueryPlanningMeta } => {
      const searchQueries = buildSearchQueries({
        question: input.question,
        description: input.description,
        resolutionSource: input.resolutionSource
      })
      return {
        searchQueries,
        planningMeta: {
          planner_configured: plannerConfigured,
          query_source: 'rules',
          fallback_reason: reason,
          message: patch?.message ?? DEFAULT_FALLBACK_MESSAGE[reason],
          upstream_http_status: patch?.upstream_http_status,
          upstream_code: patch?.upstream_code,
          debug_detail: patch?.debug_detail
        }
      }
    }

    if (!plannerConfigured) {
      return buildFallback('planner_disabled')
    }

    const call = await this.queryPlanningClient.planQueries(input)

    if (!call.ok) {
      if (call.reason === 'empty_content') {
        const base = buildFallback('llm_empty_content')
        if (this.settings.queryDebugEnabled) {
          base.planningMeta.debug_detail =
            'choices[0].message.content 为空或仅空白（仍可能 HTTP 200）'
        }
        return base
      }

      return buildFallback('llm_request_failed', {
        message: call.safeSummary,
        upstream_http_status: call.httpStatus,
        upstream_code: call.code,
        debug_detail: call.debugDetail
      })
    }

    try {
      const payload = parseQueryPlanPayload(call.outputText)
      const queries = sanitizePlannedQueries(payload, 6)
      if (queries.length < 2) {
        const base = buildFallback('queries_sanitized_insufficient')
        if (this.settings.queryDebugEnabled) {
          base.planningMeta.debug_detail = `sanitize 后仅 ${queries.length} 条（需 ≥2）`
        }
        return base
      }
      return {
        searchQueries: queries,
        planningMeta: {
          planner_configured: true,
          query_source: 'llm',
          ...(this.settings.queryDebugEnabled ? { message: '已采用 LLM 生成的检索词' } : {})
        }
      }
    } catch (e) {
      const base = buildFallback('payload_parse_failed')
      if (this.settings.queryDebugEnabled) {
        const slice = call.outputText.trim().slice(0, 400)
        const prefix =
          slice.length > 0 ? `正文前缀：${slice}` : '无正文前缀'
        if (e instanceof QueryPlanPayloadParseError) {
          base.planningMeta.debug_detail =
            e.code === 'invalid_json'
              ? `JSON.parse 失败；${prefix}`
              : `Zod 校验失败：${formatQueryPlanZodIssues(e.zodIssues)}；${prefix}`
        } else {
          base.planningMeta.debug_detail = `解析异常；${prefix}`
        }
      }
      return base
    }
  }

  async resolveQueries (request: RecommendationRequest): Promise<QueryPreviewResponse> {
    const queryMarketInput = await this.queryMarketProvider.resolveQueryMarketInput(request)

    const { searchQueries, planningMeta } =
      await this.planSearchQueries(queryMarketInput)

    return {
      question: queryMarketInput.question,
      description: queryMarketInput.description,
      resolutionSource: queryMarketInput.resolutionSource,
      searchQueries,
      planning_meta: planningMeta
    }
  }

  async resolveMarketContext (request: RecommendationRequest): Promise<MarketContext> {
    const queryMarketInput = await this.queryMarketProvider.resolveQueryMarketInput(request)

    const { searchQueries, planningMeta } =
      await this.planSearchQueries(queryMarketInput)

    return {
      marketId: queryMarketInput.marketId,
      question: queryMarketInput.question,
      description: queryMarketInput.description,
      resolutionSource: queryMarketInput.resolutionSource,
      endDate: queryMarketInput.endDate,
      searchQueries,
      planning_meta: planningMeta
    }
  }
}
