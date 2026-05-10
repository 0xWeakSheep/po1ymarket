# Fast Contribute

## 这个项目在做什么

`po1market` 目前主要在做两件事：

1. 做一个“盘口信息入口”接口。
输入一个 `market_id`，系统自动返回一组和这个盘口强相关、适合继续分析的链接。它不是死链接列表，而是会随着时间、事件进展、信息新鲜度动态变化。

2. 把 Polymarket 当作现实世界信号源 / 预言机。
后续会基于已有盘口去建模一些 Polymarket 上还不存在的新问题，例如“某人今天会不会回消息”这类更个体化的问题，并尝试把天气、新闻、其他盘口等因素一起纳入。

当前仓库里，已经落地的是第一个方向的 MVP，并且还在持续优化。

## 当前 MVP 在做什么

现在的主链路很简单：

`market_id / market_question`
-> 解析盘口信息
-> 生成搜索 query
-> 拉取候选信息源
-> 对候选源做打分 / 去重 / 过滤过期内容
-> 返回推荐链接

对应代码主要在：

- `backend/`：NestJS API，负责推荐链路本身
- `frontend/`：Next.js 工作台，负责输入参数、调用 API、展示返回结果

前端不是业务核心，核心价值在后端的“找什么、怎么排、什么时候该丢弃”。

## 项目模块怎么理解

如果按“便于协作”而不是“便于写简历”的方式来拆，这个项目可以先看成 4 个模块：

### 1. Source Recommendation API

这是当前最核心的模块，也就是第一个产品的 MVP。

主要职责：

- 根据 `market_id` 从 Polymarket 拉盘口元信息
- 或直接接受 `market_question`
- 自动生成搜索 query
- 从外部来源抓候选链接
- 做 relevance / freshness / AI rerank
- 返回推荐链接列表

关键文件：

- `backend/src/recommendations/recommendations.service.ts`
- `backend/src/recommendations/query-builder.ts`
- `backend/src/recommendations/clients/search.client.ts`
- `backend/src/recommendations/scoring.service.ts`
- `backend/src/recommendations/clients/polymarket.client.ts`

### 2. Agent / Skill 使用层

这是你提到的“使用侧内容”。

核心不是把链接找出来，而是：

- agent 什么时候该调用这个接口
- 调用时带什么上下文更有效
- 返回链接后，agent 怎么继续读、筛、总结、追问
- skill / prompt / tool use 设计怎么降低无效调用

这一层当前代码不算重，但对产品体验影响很大。

### 3. Infra / DB / 并发控制

这部分在仓库里还没有完全展开成独立模块，但它是产品能不能稳定放大的前提。

主要会涉及：

- 请求并发控制
- 缓存与去重
- 候选结果存储
- 搜索 / 打分过程的可观测性
- 配置管理与后续调度能力

如果你偏后端工程，这一块很适合尽早参与。

### 4. 未来的 Oracle / Modeling 层

这是第二阶段。

它不是“返回推荐链接”，而是“利用已有盘口和外部信号，对还不存在的盘口做预测建模”。现在可以先把它理解成未来方向，不是本仓库当前主交付面。

## 想快速参与，最推荐从哪几类事情开始

如果你想快速上手，不需要先理解全部设计。优先挑下面三类。

### A. 搜索 / 排序 / agent 算法

最容易直接产出效果，也最接近当前 MVP 的核心。

可以做的事：

- 改进 `query-builder`，让 query 更稳、更少噪音
- 增加新的候选源，而不只是 Google News / Reddit
- 优化打分逻辑，减少“相关但没用”的结果
- 处理时间敏感盘口，提升 freshness 判断
- 给不同盘口类型做不同策略

适合先读：

- `backend/src/recommendations/query-builder.ts`
- `backend/src/recommendations/clients/search.client.ts`
- `backend/src/recommendations/scoring.service.ts`

### B. 使用侧 / skill / agent workflow

如果你更懂 agent 产品，而不是传统后端，这块很适合。

可以做的事：

- 设计 agent 什么时候调用这个接口
- 设计返回结果怎么被二次消费
- 写 skill / prompt 模板
- 定义“什么时候需要补查，什么时候信息已经够了”

这块的目标不是“多调接口”，而是“让 agent 在正确的时候调，并且调完真的有用”。

### C. 后端工程 / infra

如果你偏工程稳定性，这块很有价值。

可以做的事：

- 加缓存层
- 做请求限流 / 重试 / 超时策略
- 把候选抓取改成更合理的并发模型
- 补日志、指标、trace
- 为后续 DB 落地准备 schema 和数据流

## 新人最快的进入方式

### 路线 1：先跑起来

后端：

```bash
cd backend
npm install
npm run start:dev
```

前端：

```bash
cd frontend
npm install
npm run dev
```

前端需要配置 `frontend/.env.local`：一般用 `BACKEND_PROXY_TARGET` 指向 Nest（浏览器默认请求 `/po1ymarket`）。若要浏览器直连后端，再设可选的 `NEXT_PUBLIC_API_BASE_URL`。

### 路线 2：先看最小闭环

如果你只想先理解“这个项目今天到底能干嘛”，按这个顺序读就够了：

1. `README.md`
2. `backend/src/recommendations/recommendations.service.ts`
3. `backend/src/recommendations/query-builder.ts`
4. `backend/src/recommendations/clients/search.client.ts`
5. `backend/src/recommendations/scoring.service.ts`
6. `frontend/components/dashboard/QueryConsole.tsx`

读完这些，你基本就能理解现在的 MVP。

### 路线 3：先挑一个小点改

最适合第一次 PR 的改动：

- 改一个 query 生成规则
- 新增一个候选来源
- 调一个 freshness / relevance 的阈值与测试
- 改进前端结果展示，让调试更容易
- 补一个小的错误处理或超时处理

不要一上来就试图重写整套架构。

## 当前建议的协作分工

结合现在的阶段，比较合理的分工是：

- 产品主线：先把“盘口 -> 推荐链接”这条链路继续打磨到稳定可用
- 使用侧：skill、agent 接入、调用策略
- 算法侧：搜索、召回、排序、时间敏感性判断
- 工程侧：并发、缓存、可观测性、后续 DB / infra

如果你想参与，最有效的方式不是一句“我可以帮忙”，而是直接带一个切入点来：

- 我想做搜索召回优化
- 我想补 infra / 缓存
- 我想做 agent skill 接入
- 我想加新的 source provider

这样更容易立刻开始协作。

## 一个简单判断

如果你不确定自己该做什么，就问自己一句：

“我是想让这个系统更会找信息，更会排序信息，更会被 agent 用起来，还是更稳定地跑起来？”

对应就是：

- 更会找信息：搜索 / query / source
- 更会排序信息：scoring / filtering / rerank
- 更会被 agent 用起来：skill / workflow / prompt
- 更稳定地跑起来：infra / cache / concurrency / DB

先选一个方向，再进来，会快很多。
