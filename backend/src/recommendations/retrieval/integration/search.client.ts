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
import type { CandidateSource } from '../../types/recommendations'

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
  }): Promise<CandidateSource[]> {
    const candidates: CandidateSource[] = []

    //如果官方来源是URL，则直接加入候选源
    if (input.resolutionSource?.startsWith('http')) {
      candidates.push({
        title: 'Official resolution source',
        url: input.resolutionSource,
        snippet: 'Direct resolution source supplied by the Polymarket market metadata.',
        provider: 'polymarket',
        sourceType: 'official'
      })
    }

    //计算查询词预算
    const queryBudget = Math.max(1, Math.floor(input.candidateLimit / Math.max(1, input.queries.length)))

    for (const query of input.queries) {
      //搜索Google News
      candidates.push(...await this.searchGoogleNews(query, queryBudget))
      //搜索Reddit
      candidates.push(...await this.searchReddit(query, Math.max(1, Math.floor(queryBudget / 3))))
    }

    //去重并截断
    return dedupeCandidates(candidates).slice(0, input.candidateLimit)
  }

  /**
   * 搜索 Google News
   *
   * 输入：
   * 1. 查询词
   * 2. 限制
   */
  private async searchGoogleNews (query: string, limit: number): Promise<CandidateSource[]> {
    const params = new URLSearchParams({
      q: query,
      hl: 'en-US',
      gl: 'US',
      ceid: 'US:en'
    })

    const responseText = await this.fetchText(`${this.settings.googleNewsBaseUrl}?${params.toString()}`)
    const items = extractXmlBlocks(responseText, 'item')

    return items.slice(0, limit).flatMap((item) => {
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
    })
  }

  /**
   * 搜索 Reddit
   *
   * 输入：
   * 1. 查询词
   * 2. 限制
   */
  private async searchReddit (query: string, limit: number): Promise<CandidateSource[]> {
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

    const children = response.data?.children ?? []

    return children.flatMap((child) => {
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
    })
  }

  private async fetchText (url: string): Promise<string> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.settings.requestTimeoutSeconds * 1000)

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': this.settings.userAgent },
        signal: controller.signal
      })

      if (!response.ok) {
        return ''
      }

      return await response.text()
    } catch {
      return ''
    } finally {
      clearTimeout(timeout)
    }
  }

  private async fetchJson<T> (url: string): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.settings.requestTimeoutSeconds * 1000)

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': this.settings.userAgent },
        signal: controller.signal
      })

      if (!response.ok) {
        return {} as T
      }

      return await response.json() as T
    } catch {
      return {} as T
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
