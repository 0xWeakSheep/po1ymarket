from fastapi.testclient import TestClient

from app.dependencies import get_recommendation_service
from app.main import app
from app.models import RecommendationResponse, RecommendedLink


def test_recommendation_response_is_minimal() -> None:
    class StubService:
        async def recommend(self, payload):
            return RecommendationResponse(
                recommended_sources=[
                    RecommendedLink(url="https://example.com/a", score=0.0),
                    RecommendedLink(url="https://example.com/b", score=0.0),
                ]
            )

    app.dependency_overrides[get_recommendation_service] = lambda: StubService()
    client = TestClient(app)

    response = client.post(
        "/api/v1/recommendations",
        json={"market_question": "Will Trump tweet today?"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "recommended_sources": [
            {"url": "https://example.com/a", "score": 0.0},
            {"url": "https://example.com/b", "score": 0.0},
        ]
    }

    app.dependency_overrides.clear()
