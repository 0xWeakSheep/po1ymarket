# 扩充 retrieval provider

## 问题

当前 retrieval 主要依赖：

- Google News RSS
- Reddit Search
- official source

覆盖面太窄。

## 目标

增加更多候选来源，降低“明明网上有信息却搜不到”的概率。

## 最小范围

- 新增 1 到 2 个 provider
- 与现有候选结构兼容

## 验收标准

- 对现有示例 query 的候选覆盖率提升
- provider 失败不会破坏整体链路
