# 前端使用手册（Query Console）

与 `frontend/README.md` 对齐的简明说明；页面实现以 `frontend/components/dashboard/QueryConsole.tsx` 为准。

## 页面入口

| 路径 | 说明 |
|------|------|
| `/` | 落地页；导航中的「Workbench」进入工作台 |
| `/dashboard` | **查询工作台**：左侧输入，右侧输出与 `planning_meta` 诊断 |

## Query Console 操作

1. **模式**：「使用市场 ID」或「使用自定义市场」切换请求体字段（对应后端 `market_id` / `market_question`）。
2. **示例**：「示例：市场 ID」「示例：自定义市场」一键填入常量（见 `frontend/constants/examples.ts`）。
3. **提交**：点击「查找来源」，或在非多行输入框聚焦时按 Enter（多行文本框内 Enter 为换行）。
4. **输出**：成功时展示域名、分数与链接；无结果时提示调整描述；错误时展示服务端或网络错误，并在常见场景附带联调指引。

## 环境变量与联调

- **默认（经 Next 代理）**：浏览器请求同源前缀 `/po1ymarket`，由 `next.config.ts` 转发到 `BACKEND_PROXY_TARGET`。在 `frontend/.env.local` 设置例如 `BACKEND_PROXY_TARGET=http://127.0.0.1:3001`，重启 `npm run dev`。
- **直连 Nest（可选）**：`NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3001`，需后端 CORS 允许浏览器来源。
- **无内置 mock**：未配置代理或后端未启动时，界面会显示 HTTP/网络错误；若走 `/po1ymarket` 且返回 404，文案中会提示检查 `BACKEND_PROXY_TARGET`。

## 常见问题

| 现象 | 处理 |
|------|------|
| 404 或无法连接 | 确认 `backend` 已启动、端口与 `BACKEND_PROXY_TARGET` 一致；已修改 `.env.local` 后重启 Next。 |
| `planning_meta` 显示回退 | 属 HTTP 200 下的业务降级，见 `docs/superpowers/api-contract-and-errors.md` 附录；界面中对 `fallback_reason` 提供中文摘要。 |
| 需要原始排障信息 | 后端开启 `PO1MARKET_QUERY_DEBUG=true` 时可能返回 `debug_detail`（勿在生产长期开启）。 |

## 相关文档

- `docs/superpowers/api-contract-and-errors.md` — API 与 `planning_meta` 契约  
- `frontend/AGENTS.md` — 前后端协同与文档索引  
