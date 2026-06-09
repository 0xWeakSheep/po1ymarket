# 独立 localhost 数据获取层

## 问题

当前 retrieval 仍是 `query` 服务内部模块，职责偏重且不利于后续扩展。

## 目标

把“最低级链接获取”独立成一个内部 `fetch service`，通过 localhost 与 `query` 通信。

## 最小范围

- 新增内部服务端口
- `query -> fetch` 通过 HTTP 调用
- fetch 层不做 LLM

## 验收标准

- `query` 不再直接调用 provider
- `fetch` 只负责链接获取与 provider 诊断
- 对外 API 契约保持兼容
