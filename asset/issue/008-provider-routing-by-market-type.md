# 按题材做 provider routing

## 问题

不同题材的市场，适合的信息源不同；当前 provider 使用策略几乎是固定的。

## 目标

根据市场题材、时效和来源偏好，动态调整 provider 组合。

## 最小范围

- 输出少量结构化 hint，如 `market_type`、`time_sensitivity`
- 基于 hint 调整 provider 优先级

## 验收标准

- 政治人物动态、宏观事件、产品发布等不同题材采用不同召回策略
- query 层与 retrieval 层边界保持清晰
