/**
 * Polymarket 客户端
 * 
 * 功能：
 * 1. 获取市场上下文
 * 2. 返回市场上下文
 */
import { BadRequestException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common'

import { SETTINGS } from '../../common/constants'
import type { Settings } from '../../config/settings'
import { buildSearchQueries } from '../query/domain/query-builder'
import type { MarketContext } from '../types/recommendations'

type PolymarketMarketPayload = {
  id?: string | number
  slug?: string
  question: string
  description?: string
  resolutionSource?: string
  endDate?: string
  events?: Array<{
    slug?: string
    title?: string
  }>
}

type PolymarketEventPayload = {
  id?: string | number
  slug?: string
  title?: string
  description?: string
  resolutionSource?: string
  endDate?: string
  markets?: Array<{
    id?: string | number
    slug?: string
    question?: string
    description?: string
    resolutionSource?: string
    endDate?: string
  }>
}

@Injectable()
export class PolymarketClient {
  constructor (@Inject(SETTINGS) private readonly settings: Settings) {}

  async fetchMarketById (marketId: string): Promise<MarketContext> {
    const payload = await this.fetchJson<PolymarketMarketPayload>(`/markets/${encodeURIComponent(marketId)}`, `market ${marketId}`)
    return this.mapMarketPayload(payload, marketId)
  }

  async fetchMarketBySlug (marketSlug: string): Promise<MarketContext> {
    const payload = await this.fetchJson<PolymarketMarketPayload>(`/markets/slug/${encodeURIComponent(marketSlug)}`, `market slug ${marketSlug}`)
    return this.mapMarketPayload(payload, marketSlug)
  }

  async fetchEventBySlug (eventSlug: string): Promise<MarketContext> {
    const payload = await this.fetchJson<PolymarketEventPayload>(`/events/slug/${encodeURIComponent(eventSlug)}`, `event slug ${eventSlug}`)

    const firstMarket = payload.markets?.[0]
    const question = firstMarket?.question?.trim() || payload.title?.trim()
    if (!question) {
      throw new BadRequestException(`Polymarket event ${eventSlug} is missing both markets[0].question and title.`)
    }

    const description = firstMarket?.description ?? payload.description ?? undefined
    const resolutionSource = firstMarket?.resolutionSource ?? payload.resolutionSource ?? undefined
    const endDate = firstMarket?.endDate ?? payload.endDate

    return {
      marketId: firstMarket?.id != null ? String(firstMarket.id) : undefined,
      marketSlug: firstMarket?.slug ?? undefined,
      eventSlug: payload.slug ?? eventSlug,
      question,
      description,
      resolutionSource,
      endDate: endDate ? new Date(endDate) : undefined,
      searchQueries: buildSearchQueries({
        question,
        description,
        resolutionSource
      })
    }
  }

  private async fetchJson<T> (pathname: string, label: string): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.settings.requestTimeoutSeconds * 1000)
    const upstream = this.settings.polymarketGammaApi.replace(/\/$/, '')
    const url = `${upstream}${pathname}`

    let response: Response
    try {
      response = await fetch(url, {
        headers: { 'User-Agent': this.settings.userAgent },
        signal: controller.signal
      })
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ServiceUnavailableException(
          `Polymarket API timed out after ${this.settings.requestTimeoutSeconds}s (${label}).`
        )
      }

      const cause = err instanceof Error && 'cause' in err
        ? (err as Error & { cause?: { code?: string; message?: string } }).cause
        : undefined
      const code = cause?.code ?? ''
      const detail =
        [code, err instanceof Error ? err.message : 'fetch failed'].filter(Boolean).join(' — ') || 'fetch failed'

      throw new ServiceUnavailableException(
        `Cannot reach Polymarket API at ${upstream} (${detail}). ` +
          'Common causes: firewall/VPN blocking outbound TLS, regional restrictions, or proxy/DNS issues. ' +
          'Workaround: call POST /api/v1/recommendations with only market_question to skip Gamma.'
      )
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      throw new BadRequestException(
        `Polymarket returned HTTP ${response.status} for ${label}.`
      )
    }

    try {
      return await response.json() as T
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid JSON'
      throw new BadRequestException(`Failed to parse Polymarket response for ${label}: ${message}`)
    }
  }

  private mapMarketPayload (payload: PolymarketMarketPayload, fallbackId: string): MarketContext {
    if (!payload.question?.trim()) {
      throw new BadRequestException(`Polymarket market ${fallbackId} is missing question.`)
    }

    const question = payload.question.trim()
    const description = payload.description ?? undefined
    const resolutionSource = payload.resolutionSource ?? undefined

    return {
      marketId: String(payload.id ?? fallbackId),
      marketSlug: payload.slug ?? undefined,
      eventSlug: payload.events?.[0]?.slug ?? undefined,
      question,
      description,
      resolutionSource,
      endDate: payload.endDate ? new Date(payload.endDate) : undefined,
      searchQueries: buildSearchQueries({
        question,
        description,
        resolutionSource
      })
    }
  }
}
