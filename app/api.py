from fastapi import APIRouter, Depends

from app.dependencies import get_recommendation_service
from app.models import HealthResponse, RecommendationRequest, RecommendationResponse
from app.services.recommendations import RecommendationService

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.post("/api/v1/recommendations", response_model=RecommendationResponse)
async def recommend_sources(
    payload: RecommendationRequest,
    service: RecommendationService = Depends(get_recommendation_service),
) -> RecommendationResponse:
    return await service.recommend(payload)

