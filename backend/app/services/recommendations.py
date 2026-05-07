from __future__ import annotations

from app.clients.polymarket import PolymarketClient
from app.clients.search import SearchClient
from app.config import Settings
from app.models import MarketContext, RecommendationRequest, RecommendationResponse, RecommendedLink
from app.services.query_builder import build_search_queries
from app.services.scoring import ScoringService


class RecommendationService:
    def __init__(
        self,
        settings: Settings,
        polymarket_client: PolymarketClient,
        search_client: SearchClient,
        scoring_service: ScoringService,
    ) -> None:
        self.settings = settings
        self.polymarket_client = polymarket_client
        self.search_client = search_client
        self.scoring_service = scoring_service

    async def recommend(self, request: RecommendationRequest) -> RecommendationResponse:
        market = await self._resolve_market(request)
        candidates = await self.search_client.gather_candidates(
            queries=market.search_queries,
            resolution_source=market.resolution_source,
            candidate_limit=request.candidate_limit,
        )
        scored_candidates, _ = await self.scoring_service.score_candidates(market, candidates)
        recommended = [item for item in scored_candidates if not item.stale][: request.max_results]
        return RecommendationResponse(
            recommended_sources=[RecommendedLink(url=item.url, score=0.0) for item in recommended],
        )

    async def _resolve_market(self, request: RecommendationRequest) -> MarketContext:
        if request.market_id:
            market = await self.polymarket_client.fetch_market(request.market_id)
            if request.market_question:
                market.question = request.market_question
            if request.market_description:
                market.description = request.market_description
            if request.resolution_source:
                market.resolution_source = request.resolution_source
            market.search_queries = build_search_queries(
                question=market.question,
                description=market.description,
                resolution_source=market.resolution_source,
            )
            return market

        assert request.market_question is not None
        return MarketContext(
            market_id=None,
            question=request.market_question,
            description=request.market_description,
            resolution_source=request.resolution_source,
            search_queries=build_search_queries(
                question=request.market_question,
                description=request.market_description,
                resolution_source=request.resolution_source,
            ),
        )
