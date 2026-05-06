# po1market

`po1market` is an AI-curated source recommendation API for Polymarket markets.

Given a Polymarket market ID or question, the service:

- fetches market context from Polymarket Gamma API
- generates search queries from the market wording and resolution rules
- gathers candidate links from news and social sources
- scores each link for semantic relevance and freshness
- demotes stale links and returns a ranked recommendation list

## MVP scope

- input: `market_id` or raw market question
- outputs: ranked list of news / social / official links
- scoring: heuristic by default, optional OpenAI reranking when `PO1MARKET_OPENAI_API_KEY` is set
- stale handling: links beyond a freshness threshold are rejected or heavily penalized

## Quick start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs`.

## API

`POST /api/v1/recommendations`

Example request:

```json
{
  "market_id": "540816",
  "max_results": 8,
  "candidate_limit": 20,
  "include_rejected": true
}
```

Example request without Polymarket lookup:

```json
{
  "market_question": "Will Trump tweet today?",
  "market_description": "Resolve yes if Donald Trump posts on X before 11:59 PM ET.",
  "resolution_source": "https://truthsocial.com/@realDonaldTrump"
}
```

## Notes

- Polymarket market metadata is fetched from the public Gamma API.
- Google News RSS and Reddit search are used as zero-key MVP candidate providers.
- LLM reranking is optional and falls back to heuristic scoring automatically.
