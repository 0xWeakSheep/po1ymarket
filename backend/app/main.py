from fastapi import FastAPI

from app.api import router


app = FastAPI(
    title="po1market",
    version="0.1.0",
    description="AI-curated source recommendation API for Polymarket markets.",
)
app.include_router(router)

