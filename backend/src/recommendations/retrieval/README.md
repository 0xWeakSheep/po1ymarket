# Retrieval 层说明（query + search）

`retrieval` 是推荐主链路中的“查询层”，统一承载：

- query planning（搜什么）
- candidate retrieval（怎么搜/从哪里搜）

## 目录

- `domain/retrieval.service.ts`：统一入口，串联 query + search
- `domain/candidate-retriever.service.ts`：候选召回服务，负责调用 `SearchClient`
- `integration/search.client.ts`：候选源 provider 聚合调用（Google News / Reddit）

## 对上游暴露

`RecommendationsService` 只调用 `RetrievalService.retrieve(...)`，拿到：

- `market`（包含 `searchQueries`）
- `candidates`（候选池）

这样 `recommendations` 只保留编排角色，`query + search` 收口到同一层。

**下游**：`RetrievalService` 只负责产出 `market` + `candidates`；**打分、stale 判定与最终过滤**在 `RecommendationsService` 调用 `ScoringService` 之后完成（见 `backend/src/recommendations/recommendations.service.ts` 与 `query/README.md` §6.1）。
