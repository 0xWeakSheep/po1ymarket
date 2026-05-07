from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, HttpUrl, model_validator


class SourceType(str, Enum):
    NEWS = "news"
    SOCIAL = "social"
    OFFICIAL = "official"


class HealthResponse(BaseModel):
    status: str


class RecommendationRequest(BaseModel):
    market_id: str | None = Field(
        default=None,
        description="Polymarket market id. If present without market_question, the service fetches market metadata from Gamma API.",
    )
    market_question: str | None = Field(
        default=None,
        description="Fallback market title or question if market_id is unavailable or resolution should be overridden.",
    )
    market_description: str | None = Field(default=None)
    resolution_source: str | None = Field(default=None)
    max_results: int = Field(default=8, ge=1, le=20)
    candidate_limit: int = Field(default=20, ge=5, le=50)
    include_rejected: bool = False

    @model_validator(mode="after")
    def validate_input(self) -> "RecommendationRequest":
        if not self.market_id and not self.market_question:
            raise ValueError("Either market_id or market_question must be provided.")
        return self


class MarketContext(BaseModel):
    market_id: str | None = None
    question: str
    description: str | None = None
    resolution_source: str | None = None
    end_date: datetime | None = None
    search_queries: list[str] = Field(default_factory=list)


class CandidateSource(BaseModel):
    title: str
    url: HttpUrl
    snippet: str | None = None
    source_type: SourceType
    provider: str
    published_at: datetime | None = None
    relevance_score: float = Field(default=0.0, ge=0.0, le=1.0)
    freshness_score: float = Field(default=0.0, ge=0.0, le=1.0)
    ai_score: float = Field(default=0.0, ge=0.0, le=1.0)
    total_score: float = Field(default=0.0, ge=0.0, le=1.0)
    stale: bool = False
    stale_reason: str | None = None
    rationale: str | None = None


class RecommendedLink(BaseModel):
    url: HttpUrl
    score: float = Field(default=0.0)


class RecommendationResponse(BaseModel):
    recommended_sources: list[RecommendedLink]
