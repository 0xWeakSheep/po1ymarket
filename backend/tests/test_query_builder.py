from app.services.query_builder import build_search_queries, infer_urgency


def test_build_search_queries_deduplicates_and_keeps_question() -> None:
    queries = build_search_queries(
        question="Will Trump tweet today?",
        description="Resolves to yes if Donald Trump posts on X.",
        resolution_source="https://truthsocial.com",
    )
    assert queries[0] == "Will Trump tweet today?"
    assert any("official source" in query for query in queries)
    assert len(queries) >= 3


def test_build_search_queries_extracts_focus_clause() -> None:
    queries = build_search_queries(
        question="Russia-Ukraine Ceasefire before GTA VI?",
        description="Official ceasefire agreement between Russia and Ukraine.",
    )
    assert "Russia-Ukraine Ceasefire" in queries
    assert not any("This market will resolve" in query for query in queries)


def test_infer_urgency_detects_short_horizon() -> None:
    assert infer_urgency("Will Trump tweet today?") == 1
    assert infer_urgency("Will the Fed cut rates this month?") == 7
    assert infer_urgency("Will a ceasefire happen?") == 30
