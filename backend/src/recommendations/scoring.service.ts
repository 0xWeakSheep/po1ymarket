import { Injectable } from '@nestjs/common'

import { inferUrgency } from './query/domain/query-builder'
import { OpenAiClient } from './clients/openai.client'
import {
  type CandidateSource,
  type MarketContext
} from './types/recommendations'

/**
 * Matches Python `backend/app/services/scoring.py` ordering (heuristic + optional LLM pass).
 */
@Injectable()
export class ScoringService {
  constructor (private readonly llmClient: OpenAiClient) {}

  async scoreCandidates (
    market: MarketContext,
    candidates: CandidateSource[]
  ): Promise<CandidateSource[]> {
    const scored: CandidateSource[] = []

    for (const candidate of candidates) {
      const next: CandidateSource = {
        ...candidate,
        relevanceScore: this.getRelevanceScore(market, candidate),
        freshnessScore: this.getFreshnessScore(market, candidate),
        aiScore: 0.5,
        stale: false,
        staleReason: undefined
      }

      next.totalScore = this.getTotalScore(next)
      let [stale, staleReason] = this.getStaleness(market, next)
      next.stale = stale
      next.staleReason = staleReason

      const llmResult = await this.llmClient.scoreCandidate({
        marketQuestion: market.question,
        marketDescription: market.description,
        candidateTitle: candidate.title,
        candidateSnippet: candidate.snippet,
        publishedAt: candidate.publishedAt?.toISOString(),
        sourceType: candidate.sourceType
      })

      if (llmResult) {
        next.relevanceScore = clamp(llmResult.relevance_score ?? next.relevanceScore ?? 0)
        next.freshnessScore = clamp(llmResult.freshness_score ?? next.freshnessScore ?? 0)
        next.aiScore = clamp(llmResult.ai_score ?? next.aiScore ?? 0.5)
        next.rationale = llmResult.rationale?.trim() || undefined
        next.totalScore = this.getTotalScore(next)
        ;[stale, staleReason] = this.getStaleness(market, next)
        next.stale = stale
        next.staleReason = staleReason
      }

      scored.push(next)
    }

    scored.sort((left, right) => (right.totalScore ?? 0) - (left.totalScore ?? 0))

    return scored
  }

  private getRelevanceScore (market: MarketContext, candidate: CandidateSource): number {
    const marketTerms = tokenize([market.question, market.description].filter(Boolean).join(' '))
    const candidateTerms = tokenize([candidate.title, candidate.snippet].filter(Boolean).join(' '))

    let base = 0

    if (marketTerms.size > 0 && candidateTerms.size > 0) {
      const overlap = Array.from(marketTerms).filter((term) => candidateTerms.has(term)).length
      base = overlap / marketTerms.size
    }

    if (candidate.sourceType === 'news') {
      base += 0.08
    }

    if (candidate.sourceType === 'social') {
      base -= 0.05
    }

    if (candidate.sourceType === 'official') {
      base += 0.25
    }

    return clamp(base)
  }

  private getFreshnessScore (market: MarketContext, candidate: CandidateSource): number {
    if (!candidate.publishedAt) {
      return candidate.sourceType === 'official' ? 0.55 : 0.4
    }

    const ageDays = Math.max(0, (Date.now() - candidate.publishedAt.getTime()) / 86400000)
    const urgencyWindow = inferUrgency(market.question)
    const decay = Math.exp(-ageDays / Math.max(1, urgencyWindow))

    return clamp(decay)
  }

  private getStaleness (market: MarketContext, candidate: CandidateSource): [boolean, string | undefined] {
    if (candidate.sourceType === 'official') {
      return [false, undefined]
    }

    const relevanceScore = candidate.relevanceScore ?? 0
    const minRelevance = candidate.sourceType === 'social' ? 0.14 : 0.09

    if (relevanceScore < minRelevance) {
      return [true, 'Semantic overlap with the market is too weak.']
    }

    if (!candidate.publishedAt) {
      return [false, undefined]
    }

    const ageDays = (Date.now() - candidate.publishedAt.getTime()) / 86400000
    const thresholdDays = inferUrgency(market.question) * 3

    if (ageDays > thresholdDays) {
      return [true, `Published ${ageDays.toFixed(1)} days ago, beyond ${thresholdDays}-day freshness threshold.`]
    }

    return [false, undefined]
  }

  private getTotalScore (candidate: CandidateSource): number {
    let total = (
      (candidate.relevanceScore ?? 0) * 0.45 +
      (candidate.freshnessScore ?? 0) * 0.35 +
      (candidate.aiScore ?? 0) * 0.20
    )

    if (candidate.stale) {
      total *= 0.4
    }

    return clamp(total)
  }
}

function tokenize (text: string): Set<string> {
  return new Set(
    (text.match(/[A-Za-z0-9']+/g) ?? [])
      .map((token) => token.toLowerCase())
      .filter((token) => token.length > 2)
  )
}

function clamp (value: number): number {
  return Math.max(0, Math.min(1, value))
}
