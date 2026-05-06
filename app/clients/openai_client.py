from __future__ import annotations

import json

import httpx

from app.config import Settings


class OpenAIClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    @property
    def enabled(self) -> bool:
        return bool(self.settings.openai_api_key and self.settings.llm_rerank_enabled)

    async def score_candidate(
        self,
        market_question: str,
        market_description: str | None,
        candidate_title: str,
        candidate_snippet: str | None,
        published_at: str | None,
    ) -> dict[str, float | str] | None:
        if not self.enabled:
            return None

        prompt = {
            "market_question": market_question,
            "market_description": market_description,
            "candidate_title": candidate_title,
            "candidate_snippet": candidate_snippet,
            "published_at": published_at,
            "task": "Return JSON with relevance_score, freshness_score, ai_score, rationale. Scores must be numbers between 0 and 1.",
        }
        headers = {
            "Authorization": f"Bearer {self.settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "model": self.settings.openai_model,
            "input": [
                {
                    "role": "system",
                    "content": "You score candidate links for a prediction market research agent. Be strict on staleness and ambiguity.",
                },
                {"role": "user", "content": json.dumps(prompt)},
            ],
        }
        url = f"{self.settings.openai_base_url.rstrip('/')}/responses"
        async with httpx.AsyncClient(timeout=self.settings.request_timeout_seconds) as client:
            response = await client.post(url, headers=headers, json=body)
            response.raise_for_status()
            payload = response.json()

        text = payload.get("output_text")
        if not text:
            return None
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            return None
        return parsed

