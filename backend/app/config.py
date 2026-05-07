from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    polymarket_gamma_api: str = "https://gamma-api.polymarket.com"
    request_timeout_seconds: float = 15.0
    google_news_base_url: str = "https://news.google.com/rss/search"
    reddit_search_base_url: str = "https://www.reddit.com/search.json"
    user_agent: str = "po1market/0.1 (+https://github.com/0xWeakSheep/po1market)"
    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4.1-mini"
    llm_rerank_enabled: bool = True
    market_default_limit: int = 8
    market_candidate_limit: int = 20

    # Support running the backend from `backend/` while still honoring
    # an existing repository-root `.env` during the transition.
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), env_prefix="PO1MARKET_")


settings = Settings()

