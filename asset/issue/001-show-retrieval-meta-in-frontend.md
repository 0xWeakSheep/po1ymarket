# 前端展示 retrieval_meta

## 问题

后端已经返回 `retrieval_meta`，但前端没有展示。用户现在只能看到“暂无候选来源”，看不出是：

- provider 请求失败
- provider 没有结果
- 还是结果被后续过滤掉

## 目标

在结果面板中展示 `retrieval_meta` 的最小摘要。

## 最小范围

- 显示 provider 名称
- 显示 candidate 数量
- 显示 failed query 数量
- 显示过滤前 / 过滤后数量

## 验收标准

- 空结果时前端可直接看出问题落在哪一层
- 成功结果时也能看到本次召回摘要
- 不影响现有 `planning_meta` 展示
