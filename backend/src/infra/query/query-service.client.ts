import {
  BadGatewayException,
  Inject,
  Injectable,
  ServiceUnavailableException
} from '@nestjs/common'

import { SETTINGS } from '../../common/constants'
import type { Settings } from '../../config/settings'
import type {
  QueryPreviewResponse,
  RecommendationRequest,
  RecommendationResponse
} from '../../recommendations/types/recommendations'

@Injectable()
export class QueryServiceClient {
  constructor (@Inject(SETTINGS) private readonly settings: Settings) {}

  async fetchRecommendations (
    request: RecommendationRequest
  ): Promise<RecommendationResponse> {
    return await this.post<RecommendationResponse>('/api/v1/recommendations', request)
  }

  async fetchQueries (
    request: RecommendationRequest
  ): Promise<QueryPreviewResponse> {
    return await this.post<QueryPreviewResponse>('/api/v1/search/queries', request)
  }

  private async post<T> (pathname: string, payload: RecommendationRequest): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      this.settings.queryServiceTimeoutSeconds * 1000
    )

    try {
      const response = await fetch(`${this.settings.queryServiceBaseUrl}${pathname}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.settings.userAgent
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      if (!response.ok) {
        const body = await safeReadText(response)
        throw new BadGatewayException(
          `Query service returned HTTP ${response.status}${body ? `: ${body}` : ''}`
        )
      }

      return await response.json() as T
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error
      }

      throw new ServiceUnavailableException(
        `Query service at ${this.settings.queryServiceBaseUrl}${pathname} did not respond successfully within ${this.settings.queryServiceTimeoutSeconds}s.`
      )
    } finally {
      clearTimeout(timeout)
    }
  }
}

async function safeReadText (response: Response): Promise<string> {
  try {
    return (await response.text()).trim().slice(0, 400)
  } catch {
    return ''
  }
}
