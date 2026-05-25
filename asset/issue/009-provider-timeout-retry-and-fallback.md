# provider 级 timeout / retry / fallback

## 问题

当前 provider 请求失败时虽然已有部分诊断，但恢复能力仍弱，容易直接导致候选不足。

## 目标

让 retrieval 在 provider 抖动时更稳。

## 最小范围

- provider 级 timeout
- 有界 retry
- 某 provider 失败时不阻断其他 provider

## 验收标准

- 单一 provider 故障时整体推荐链仍可继续返回结果或明确诊断
- 不出现无限重试或整体延迟失控
