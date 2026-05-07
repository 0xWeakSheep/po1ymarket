# Backend

`po1market` backend is a FastAPI service that recommends sources for Polymarket markets.

Given a Polymarket market ID or question, the service:

- fetches market context from the Polymarket Gamma API
- generates search queries from the market wording and resolution rules
- gathers candidate links from news and social sources
- scores each link for semantic relevance and freshness
- demotes stale links and returns a ranked recommendation list

## Quick start

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs`.

## Test

```bash
cd backend
pytest
```

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

Example response:

```json
{
  "recommended_sources": [
    {
      "url": "https://news.google.com/rss/articles/...",
      "score": 0
    },
    {
      "url": "https://www.reddit.com/...",
      "score": 0
    }
  ]
}
```
