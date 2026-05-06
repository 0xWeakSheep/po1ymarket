from __future__ import annotations

from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html import unescape
import re
from typing import Iterable
from urllib.parse import quote_plus
from xml.etree import ElementTree

import httpx

from app.config import Settings
from app.models import CandidateSource, SourceType


class SearchClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def gather_candidates(
        self,
        queries: list[str],
        resolution_source: str | None,
        candidate_limit: int,
    ) -> list[CandidateSource]:
        candidates: list[CandidateSource] = []

        if resolution_source and resolution_source.startswith("http"):
            candidates.append(
                CandidateSource(
                    title="Official resolution source",
                    url=resolution_source,
                    snippet="Direct resolution source supplied by the Polymarket market metadata.",
                    provider="polymarket",
                    source_type=SourceType.OFFICIAL,
                    published_at=None,
                )
            )

        query_budget = max(1, candidate_limit // max(1, len(queries)))
        for query in queries:
            candidates.extend(await self._search_google_news(query, limit=query_budget))
            candidates.extend(await self._search_reddit(query, limit=max(1, query_budget // 3)))

        return self._dedupe(candidates)[:candidate_limit]

    async def _search_google_news(self, query: str, limit: int) -> list[CandidateSource]:
        params = f"q={quote_plus(query)}&hl=en-US&gl=US&ceid=US:en"
        url = f"{self.settings.google_news_base_url}?{params}"
        async with httpx.AsyncClient(timeout=self.settings.request_timeout_seconds) as client:
            response = await client.get(url, headers={"User-Agent": self.settings.user_agent})
            response.raise_for_status()
        root = ElementTree.fromstring(response.text)
        items = root.findall(".//item")
        results: list[CandidateSource] = []
        for item in items[:limit]:
            link = item.findtext("link")
            title = item.findtext("title")
            description = item.findtext("description")
            pub_date = self._parse_datetime(item.findtext("pubDate"))
            if not link or not title:
                continue
            results.append(
                CandidateSource(
                    title=title,
                    url=link,
                    snippet=_strip_html(description),
                    provider="google_news",
                    source_type=SourceType.NEWS,
                    published_at=pub_date,
                )
            )
        return results

    async def _search_reddit(self, query: str, limit: int) -> list[CandidateSource]:
        params = {
            "q": query,
            "sort": "new",
            "limit": str(limit),
            "raw_json": "1",
            "type": "link",
        }
        async with httpx.AsyncClient(timeout=self.settings.request_timeout_seconds) as client:
            response = await client.get(
                self.settings.reddit_search_base_url,
                params=params,
                headers={"User-Agent": self.settings.user_agent},
            )
            response.raise_for_status()
            payload = response.json()

        children = payload.get("data", {}).get("children", [])
        results: list[CandidateSource] = []
        for child in children[:limit]:
            data = child.get("data", {})
            permalink = data.get("permalink")
            title = data.get("title")
            if not permalink or not title:
                continue
            results.append(
                CandidateSource(
                    title=title,
                    url=f"https://www.reddit.com{permalink}",
                    snippet=data.get("selftext") or data.get("url"),
                    provider="reddit",
                    source_type=SourceType.SOCIAL,
                    published_at=self._parse_unix(data.get("created_utc")),
                )
            )
        return results

    def _dedupe(self, candidates: Iterable[CandidateSource]) -> list[CandidateSource]:
        seen: set[str] = set()
        deduped: list[CandidateSource] = []
        for candidate in candidates:
            key = str(candidate.url)
            if key in seen:
                continue
            seen.add(key)
            deduped.append(candidate)
        return deduped

    def _parse_datetime(self, value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            return parsedate_to_datetime(value).astimezone(timezone.utc)
        except (TypeError, ValueError):
            return None

    def _parse_unix(self, value: int | float | None) -> datetime | None:
        if value is None:
            return None
        return datetime.fromtimestamp(value, tz=timezone.utc)


def _strip_html(value: str | None) -> str | None:
    if not value:
        return None
    plain = re.sub(r"<[^>]+>", " ", value)
    return " ".join(unescape(plain).split())
