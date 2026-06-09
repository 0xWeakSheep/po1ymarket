# 放宽高时效问题的 stale 规则

## 问题

`today / tonight / this hour` 这类 query 当前 stale 窗口太短，容易把检索到的结果全部过滤掉。

## 目标

降低高时效问题被“全量清空”的概率。

## 最小范围

- 调整 `inferUrgency` 相关阈值
- 或调整 `getStaleness` 中的阈值计算

## 验收标准

- 对高时效 query，不再频繁出现“明明有候选但全部为空”
- 补充单测覆盖高时效场景
