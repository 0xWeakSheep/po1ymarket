# Polymarket 失败时降级到纯文本

## 问题

当请求同时带有 Polymarket 标识和 `market_question` 时，如果 Gamma 获取失败，当前链路仍偏向直接失败。

## 目标

当 Polymarket 获取失败且请求中已有足够文本信息时，自动降级走纯文本模式。

## 最小范围

- 只在已有 `market_question` 的情况下触发降级
- 保留明确诊断信息

## 验收标准

- Gamma 故障不会直接阻断已有文本上下文的请求
- 响应体中能看出发生过降级
