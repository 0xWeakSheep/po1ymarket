/**
 * 搜索客户端
 *
 * 功能：
 * 1. 收集候选源：reddit、google news
 * 2. 返回候选源列表：去重、限制数量
 */

import { Inject, Injectable } from '@nestjs/common'

import { SETTINGS } from '../../../common/constants'
import type { Settings } from '../../../config/settings'
import type {
  CandidateSource,
  RetrievalMeta,
  RetrievalProviderDebug
} from '../../types/recommendations'

type FetchTextResult = {
  ok: boolean
  status?: number
  body: string
  error?: string
}

type FetchJsonResult<T> = {
  ok: boolean
  status?: number
  body: T
  error?: string
}

type SearchBatchResult = {
  candidates: CandidateSource[]
  failed: boolean
  failureReason?: string
}

@Injectable()
export class SearchClient {
  constructor (@Inject(SETTINGS) private readonly settings: Settings) {}

  /**
   * 收集候选源
   *
   * 输入：
   * 1. 查询词列表
   * 2. 官方来源
   * 3. 候选源限制
   */
  async gatherCandidates (input: {
    queries: string[]
    resolutionSource?: string
    candidateLimit: number
  }): Promise<{ candidates: CandidateSource[]; retrievalMeta: RetrievalMeta }> {
    const candidates: CandidateSource[] = []
    const providerStats = new Map<string, {
      queryCount: number
      candidateCount: number
      failedQueryCount: number
      failureReasons: string[]
    }>()

    //如果官方来源是URL，则直接加入候选源
    if (input.resolutionSource?.startsWith('http')) {
      candidates.push({
        title: 'Official resolution source',
        url: input.resolutionSource,
        snippet: 'Direct resolution source supplied by the Polymarket market metadata.',
        provider: 'polymarket',
        sourceType: 'official'
      })
      providerStats.set('polymarket', {
        queryCount: 0,
        candidateCount: 1,
        failedQueryCount: 0,
        failureReasons: []
      })
    }

    //计算查询词预算
    const queryBudget = Math.max(1, Math.floor(input.candidateLimit / Math.max(1, input.queries.length)))

    const searchTasks = input.queries.flatMap((query) => [
      this.searchGoogleNews(query, queryBudget).then((result) => ({ provider: 'google_news', result })),
      this.searchReddit(query, Math.max(1, Math.floor(queryBudget / 3))).then((result) => ({ provider: 'reddit', result }))
    ])
    const resultGroups = await Promise.all(searchTasks)
    for (const { provider, result } of resultGroups) {
      const entry = providerStats.get(provider) ?? {
        queryCount: 0,
        candidateCount: 0,
        failedQueryCount: 0,
        failureReasons: []
      }
      entry.queryCount += 1
      entry.candidateCount += result.candidates.length
      if (result.failed) {
        entry.failedQueryCount += 1
        if (result.failureReason) entry.failureReasons.push(result.failureReason)
      }
      providerStats.set(provider, entry)
      candidates.push(...result.candidates)
    }

    //去重并截断
    const deduped = dedupeCandidates(candidates).slice(0, input.candidateLimit)
    const providers: RetrievalProviderDebug[] = Array.from(providerStats.entries()).map(([provider, stats]) => ({
      provider,
      query_count: stats.queryCount,
      candidate_count: stats.candidateCount,
      failed_query_count: stats.failedQueryCount,
      ...(stats.failureReasons.length > 0 ? { failure_reasons: Array.from(new Set(stats.failureReasons)).slice(0, 5) } : {})
    }))

    return {
      candidates: deduped,
      retrievalMeta: {
        query_count: input.queries.length,
        providers,
        total_candidates_before_scoring: deduped.length
      }
    }
  }

  /**
   * 搜索 Google News
   *
   * 输入：
   * 1. 查询词
   * 2. 限制
   */
  private async searchGoogleNews (query: string, limit: number): Promise<SearchBatchResult> {
    const params = new URLSearchParams({
      q: query,
      hl: 'en-US',
      gl: 'US',
      ceid: 'US:en'
    })

    const response = await this.fetchText(`${this.settings.googleNewsBaseUrl}?${params.toString()}`)
    if (!response.ok) {
      return {
        candidates: [],
        failed: true,
        failureReason: response.error ?? `http_${response.status ?? 'unknown'}`
      }
    }
    const items = extractXmlBlocks(response.body, 'item')

    return {
      candidates: items.slice(0, limit).flatMap((item) => {
      const link = extractXmlTag(item, 'link')
      const title = extractXmlTag(item, 'title')
      const description = stripHtml(extractXmlTag(item, 'description'))

      if (!link || !title) {
        return []
      }

      return [{
        title,
        url: link,
        snippet: description ?? undefined,
        provider: 'google_news',
        sourceType: 'news' as const,
        publishedAt: parseRfcDate(extractXmlTag(item, 'pubDate'))
      }]
      }),
      failed: false
    }
  }

  /**
   * 搜索 Reddit
   *
   * 输入：
   * 1. 查询词
   * 2. 限制
   */
  private async searchReddit (query: string, limit: number): Promise<SearchBatchResult> {
    const params = new URLSearchParams({
      q: query,
      sort: 'new',
      limit: String(limit),
      raw_json: '1',
      type: 'link'
    })

    const response = await this.fetchJson<{ data?: { children?: Array<{ data?: Record<string, unknown> }> } }>(
      `${this.settings.redditSearchBaseUrl}?${params.toString()}`
    )
    if (!response.ok) {
      return {
        candidates: [],
        failed: true,
        failureReason: response.error ?? `http_${response.status ?? 'unknown'}`
      }
    }

    const children = response.body.data?.children ?? []

    return {
      candidates: children.flatMap((child) => {
      const data = child.data ?? {}
      const permalink = typeof data.permalink === 'string' ? data.permalink : undefined
      const title = typeof data.title === 'string' ? data.title : undefined

      if (!permalink || !title) {
        return []
      }

      const snippet = typeof data.selftext === 'string' && data.selftext
        ? data.selftext
        : typeof data.url === 'string' ? data.url : undefined

      return [{
        title,
        url: `https://www.reddit.com${permalink}`,
        snippet,
        provider: 'reddit',
        sourceType: 'social' as const,
        publishedAt: parseUnixTime(typeof data.created_utc === 'number' ? data.created_utc : undefined)
      }]
      }),
      failed: false
    }
  }

  private async fetchText (url: string): Promise<FetchTextResult> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.settings.requestTimeoutSeconds * 1000)

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': this.settings.userAgent },
        signal: controller.signal
      })

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          body: '',
          error: `http_${response.status}`
        }
      }

      return {
        ok: true,
        status: response.status,
        body: await response.text()
      }
    } catch (error) {
      return {
        ok: false,
        body: '',
        error: error instanceof Error ? error.name : 'fetch_failed'
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  private async fetchJson<T> (url: string): Promise<FetchJsonResult<T>> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.settings.requestTimeoutSeconds * 1000)

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': this.settings.userAgent },
        signal: controller.signal
      })

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          body: {} as T,
          error: `http_${response.status}`
        }
      }

      return {
        ok: true,
        status: response.status,
        body: await response.json() as T
      }
    } catch (error) {
      return {
        ok: false,
        body: {} as T,
        error: error instanceof Error ? error.name : 'fetch_failed'
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}

function dedupeCandidates (candidates: CandidateSource[]): CandidateSource[] {
  const seen = new Set<string>()
  const deduped: CandidateSource[] = []

  for (const candidate of candidates) {
    if (seen.has(candidate.url)) {
      continue
    }

    seen.add(candidate.url)
    deduped.push(candidate)
  }

  return deduped
}

function extractXmlBlocks (xml: string, tag: string): string[] {
  const matcher = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g')
  return Array.from(xml.matchAll(matcher), (match) => match[1] ?? '')
}

function extractXmlTag (xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return match?.[1]?.trim() ?? null
}

function stripHtml (value: string | null): string | null {
  if (!value) {
    return null
  }

  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseRfcDate (value: string | null): Date | undefined {
  if (!value) {
    return undefined
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function parseUnixTime (value?: number): Date | undefined {
  if (typeof value !== 'number') {
    return undefined
  }

  return new Date(value * 1000)
}
