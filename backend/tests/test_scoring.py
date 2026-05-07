from datetime import datetime, timedelta, timezone

from app.clients.openai_client import OpenAIClient
from app.config import Settings
from app.models import CandidateSource, MarketContext, SourceType
from app.services.scoring import ScoringService


class DisabledOpenAIClient(OpenAIClient):
    @property
    def enabled(self) -> bool:
        return False


def test_stale_social_link_is_penalized() -> None:
    service = ScoringService(settings=Settings(), openai_client=DisabledOpenAIClient(Settings()))
    market = MarketContext(question="Will Trump tweet today?", search_queries=["Will Trump tweet today?"])
    candidate = CandidateSource(
        title="Old reddit thread about Trump",
        url="https://www.reddit.com/r/politics/comments/example",
        snippet="Discussion from last year",
        provider="reddit",
        source_type=SourceType.SOCIAL,
        published_at=datetime.now(timezone.utc) - timedelta(days=10),
    )

    scored, _ = _run(service, market, candidate)
    assert scored.stale is True
    assert scored.total_score < 0.5


def test_official_source_is_not_marked_stale() -> None:
    service = ScoringService(settings=Settings(), openai_client=DisabledOpenAIClient(Settings()))
    market = MarketContext(question="Will Trump tweet today?", search_queries=["Will Trump tweet today?"])
    candidate = CandidateSource(
        title="Official resolution source",
        url="https://example.com/source",
        provider="polymarket",
        source_type=SourceType.OFFICIAL,
    )

    scored, _ = _run(service, market, candidate)
    assert scored.stale is False
    assert scored.total_score > 0.4


def _run(
    service: ScoringService,
    market: MarketContext,
    candidate: CandidateSource,
) -> tuple[CandidateSource, str]:
    import asyncio

    results, strategy = asyncio.run(service.score_candidates(market, [candidate]))
    return results[0], strategy
