from __future__ import annotations

from typing import Any

import httpx

from app.config import Settings
from app.models import MarketContext
from app.services.query_builder import build_search_queries
from dateutil.parser import isoparse


class PolymarketClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def fetch_market(self, market_id: str) -> MarketContext:
        url = f"{self.settings.polymarket_gamma_api.rstrip('/')}/markets/{market_id}"
        headers = {"User-Agent": self.settings.user_agent}
        async with httpx.AsyncClient(timeout=self.settings.request_timeout_seconds) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            payload = response.json()

        return self._to_market_context(payload)

    def _to_market_context(self, payload: dict[str, Any]) -> MarketContext:
        question = payload["question"].strip()
        description = payload.get("description") or None
        resolution_source = payload.get("resolutionSource") or None
        end_date_raw = payload.get("endDate")
        end_date = isoparse(end_date_raw) if end_date_raw else None
        return MarketContext(
            market_id=str(payload.get("id")),
            question=question,
            description=description,
            resolution_source=resolution_source,
            end_date=end_date,
            search_queries=build_search_queries(
                question=question,
                description=description,
                resolution_source=resolution_source,
            ),
        )

