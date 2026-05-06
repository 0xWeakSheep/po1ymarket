from app.clients.openai_client import OpenAIClient
from app.clients.polymarket import PolymarketClient
from app.clients.search import SearchClient
from app.config import settings
from app.services.recommendations import RecommendationService
from app.services.scoring import ScoringService


def get_recommendation_service() -> RecommendationService:
    search_client = SearchClient(settings=settings)
    scoring_service = ScoringService(
        settings=settings,
        openai_client=OpenAIClient(settings=settings),
    )
    return RecommendationService(
        settings=settings,
        polymarket_client=PolymarketClient(settings=settings),
        search_client=search_client,
        scoring_service=scoring_service,
    )

