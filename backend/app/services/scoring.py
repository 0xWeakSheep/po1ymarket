from __future__ import annotations

from datetime import datetime, timezone
from math import exp
import re
from typing import Iterable

from app.clients.openai_client import OpenAIClient
from app.config import Settings
from app.models import CandidateSource, MarketContext, SourceType
from app.services.query_builder import infer_urgency


class ScoringService:
    def __init__(self, settings: Settings, openai_client: OpenAIClient) -> None:
        self.settings = settings
        self.openai_client = openai_client

    async def score_candidates(
        self,
        market: MarketContext,
        candidates: Iterable[CandidateSource],
    ) -> tuple[list[CandidateSource], str]:
        scored: list[CandidateSource] = []
        llm_used = False
        for candidate in candidates:
            candidate.relevance_score = self._relevance_score(market, candidate)
            candidate.freshness_score = self._freshness_score(market, candidate)
            candidate.ai_score = 0.5
            candidate.total_score = self._total_score(candidate)
            candidate.stale, candidate.stale_reason = self._staleness(market, candidate)

            llm_result = await self.openai_client.score_candidate(
                market_question=market.question,
                market_description=market.description,
                candidate_title=candidate.title,
                candidate_snippet=candidate.snippet,
                published_at=candidate.published_at.isoformat() if candidate.published_at else None,
            )
            if llm_result:
                llm_used = True
                candidate.relevance_score = _clamp(float(llm_result.get("relevance_score", candidate.relevance_score)))
                candidate.freshness_score = _clamp(float(llm_result.get("freshness_score", candidate.freshness_score)))
                candidate.ai_score = _clamp(float(llm_result.get("ai_score", candidate.ai_score)))
                candidate.rationale = str(llm_result.get("rationale", "")).strip() or None
                candidate.total_score = self._total_score(candidate)
                candidate.stale, candidate.stale_reason = self._staleness(market, candidate)

            scored.append(candidate)

        scored.sort(key=lambda item: item.total_score, reverse=True)
        return scored, "llm+heuristic" if llm_used else "heuristic"

    def _relevance_score(self, market: MarketContext, candidate: CandidateSource) -> float:
        market_terms = _tokenize(" ".join(filter(None, [market.question, market.description])))
        candidate_terms = _tokenize(" ".join(filter(None, [candidate.title, candidate.snippet])))
        if not market_terms or not candidate_terms:
            base = 0.0
        else:
            overlap = len(market_terms.intersection(candidate_terms))
            base = overlap / len(market_terms)
        if candidate.source_type is SourceType.NEWS:
            base += 0.08
        if candidate.source_type is SourceType.SOCIAL:
            base -= 0.05
        if candidate.source_type is SourceType.OFFICIAL:
            base += 0.25
        return _clamp(base)

    def _freshness_score(self, market: MarketContext, candidate: CandidateSource) -> float:
        if not candidate.published_at:
            return 0.55 if candidate.source_type is SourceType.OFFICIAL else 0.4
        now = datetime.now(timezone.utc)
        age_days = max(0.0, (now - candidate.published_at).total_seconds() / 86400)
        urgency_window = infer_urgency(market.question)
        decay = exp(-age_days / max(1.0, urgency_window))
        return _clamp(decay)

    def _staleness(self, market: MarketContext, candidate: CandidateSource) -> tuple[bool, str | None]:
        if candidate.source_type is SourceType.OFFICIAL:
            return False, None
        min_relevance = 0.14 if candidate.source_type is SourceType.SOCIAL else 0.09
        if candidate.relevance_score < min_relevance:
            return True, "Semantic overlap with the market is too weak."
        if not candidate.published_at:
            return False, None
        age_days = (datetime.now(timezone.utc) - candidate.published_at).total_seconds() / 86400
        threshold_days = infer_urgency(market.question) * 3
        if age_days > threshold_days:
            return True, f"Published {age_days:.1f} days ago, beyond {threshold_days}-day freshness threshold."
        return False, None

    def _total_score(self, candidate: CandidateSource) -> float:
        total = (
            candidate.relevance_score * 0.45
            + candidate.freshness_score * 0.35
            + candidate.ai_score * 0.20
        )
        if candidate.stale:
            total *= 0.4
        return _clamp(total)


def _tokenize(text: str) -> set[str]:
    return {
        token.lower()
        for token in re.findall(r"[A-Za-z0-9']+", text)
        if len(token) > 2
    }


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))
