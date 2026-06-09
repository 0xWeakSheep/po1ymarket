# 后端结构说明

## 目标

- 保持 `backend/` 仍然是一个单独的构建与部署单元，尽量不改现有 CI/CD。
- 由 `infra` 应用继续对外暴露主 API，端口保持当前主端口语义不变。
- 将推荐、query、检索、打分等核心业务下沉到内部 `query` 服务。
- 使用 MongoDB 做短时缓存，在窗口期内相同市场请求直接命中缓存，不再重复打到 query 层。

## 顶层目录

```text
backend/src/
  apps/
    infra/
      infra-app.module.ts
    query/
      main.ts
      query-app.module.ts
  infra/
    cache/
    query/
    recommendations/
    search/
    infra.module.ts
  recommendations/
    application/
    clients/
    query/
    retrieval/
    recommendations.module.ts
    recommendations.service.ts
    scoring.service.ts
  config/
  common/
  health/
  prompts/
  main.ts
```

## 运行时拆分

### Infra 应用

- 对外端口：`PORT`，默认 `3001`
- 保留当前公开接口：
  - `POST /api/v1/recommendations`
  - `POST /api/v1/search/queries`
- 主要职责：
  - 请求校验
  - Mongo 短时缓存
  - 缓存未命中时转发到内部 query 服务
  - 保持现有对外入口与 CORS 行为稳定

### Query 应用

- 内部端口：`PO1MARKET_QUERY_SERVICE_PORT`，默认 `3002`
- 承载当前核心业务逻辑：
  - 市场上下文解析
  - query planning 与 fallback
  - 候选源检索
  - 打分与 rerank

## 进程模型

- `backend/src/main.ts` 现在是一个 launcher。
- launcher 会先启动公开的 infra Nest app，再 fork `dist/apps/query/main.js` 作为内部 query 子进程。
- 部署侧仍然只需要启动一个 `dist/main.js`，因此 PM2 与 GitHub Actions 基本不需要调整结构。

## 分层说明

### 1. `infra`

负责对外传输层与基础设施能力。

- `infra/recommendations/*`
  - 对外的 recommendations 接口
- `infra/search/*`
  - 对外的 query preview 接口
- `infra/query/query-service.client.ts`
  - 调用内部 query 服务的 HTTP client
- `infra/cache/*`
  - Mongo 持久化与 TTL 请求缓存

### 2. `recommendations`

负责推荐结果生成的业务层。

- `application/`
  - 请求标准化
- `query/domain/`
  - query planning 规则与编排
- `query/integration/`
  - 市场、provider、planner 适配
- `retrieval/domain/`
  - 候选源检索编排
- `retrieval/integration/`
  - Google News / Reddit 适配
- `clients/`
  - Polymarket、OpenAI 兼容模型等上游客户端

## 缓存约定

- 缓存后端：MongoDB 集合 `request_cache`
- 缓存 key：路由 scope + 归一化后的请求体
- 当前 scope：
  - `recommendations`
  - `queries`
- TTL 控制项：`PO1MARKET_QUERY_CACHE_TTL_SECONDS`

在 TTL 窗口期内，相同请求会直接从 Mongo 返回，不再命中内部 query 服务。

## 新增环境变量

- `PO1MARKET_QUERY_SERVICE_PORT`
- `PO1MARKET_QUERY_SERVICE_HOST`
- `PO1MARKET_QUERY_SERVICE_BASE_URL`
- `PO1MARKET_QUERY_CACHE_TTL_SECONDS`
- `PO1MARKET_MONGODB_URI`
- `PO1MARKET_MONGODB_DB_NAME`

## 建议的下一步继续拆分

如果你准备继续往下重构，下一层最适合继续拆的是：

1. `shared`
   - 放共享 DTO、配置、HTTP helper、通用错误映射
2. `contracts`
   - 明确 `infra` 与 `query` 之间的内部 API 契约
3. `persistence`
   - 如果 Mongo 的用途不再只是请求缓存，可以从 `infra/cache` 独立出来

这次我没有强行继续拆这几层，是因为那会显著扩大改动面，并且会更容易影响你当前的 CI/CD 与部署习惯。
