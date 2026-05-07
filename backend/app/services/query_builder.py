from __future__ import annotations

import re

STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "be",
    "before",
    "by",
    "did",
    "does",
    "for",
    "if",
    "in",
    "is",
    "of",
    "on",
    "or",
    "the",
    "to",
    "today",
    "will",
    "with",
}


def build_search_queries(
    question: str,
    description: str | None = None,
    resolution_source: str | None = None,
) -> list[str]:
    normalized_question = " ".join(question.strip().split())
    focus_question = _extract_focus_clause(normalized_question)
    tokens = [
        token
        for token in re.findall(r"[A-Za-z0-9']+", focus_question.lower())
        if token not in STOP_WORDS and len(token) > 2
    ]
    key_phrase = " ".join(tokens[:6]).strip()
    queries = [normalized_question, focus_question]
    if key_phrase and key_phrase.lower() != focus_question.lower():
        queries.append(key_phrase)
    if resolution_source and resolution_source.startswith("http"):
        queries.append(f"{focus_question} official source")
    return _unique_nonempty(queries)


def infer_urgency(question: str) -> int:
    lowered = question.lower()
    if any(marker in lowered for marker in ("today", "tonight", "this hour", "in may", "this week")):
        return 1
    if any(marker in lowered for marker in ("this month", "before", "by ")):
        return 7
    return 30


def _unique_nonempty(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        normalized = " ".join(value.strip().split())
        if not normalized or normalized.lower() in seen:
            continue
        seen.add(normalized.lower())
        result.append(normalized)
    return result


def _extract_focus_clause(question: str) -> str:
    match = re.split(r"\b(before|after|by|if|unless|until)\b", question, maxsplit=1, flags=re.IGNORECASE)
    focus = match[0].strip(" ?") if match else question.strip(" ?")
    return focus or question.strip()

