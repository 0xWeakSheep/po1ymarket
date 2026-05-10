# Frontend (Next.js)

Workbench UI for `po1market`. This package is **presentation + browser HTTP client only**: it does not implement ranking, scoring, or source discovery.

## 与后端的分工

| 层级 | 目录 | 职责 |
|------|------|------|
| **后端 API** | 仓库内 `backend/`（Nest） | `POST /api/v1/recommendations`：解析市场 ID / 文案，返回 `recommended_sources`。业务规则、数据与打分在此维护。 |
| **前端** | 本目录 | 布局与 Query Console UI；默认请求同源 `/po1ymarket`（由 Next 代理到 Nest）；可选 `NEXT_PUBLIC_API_BASE_URL` 直连调试。类型见 `types/`，环境见 `config/`，见 `api/`。 |

## 目录结构（约定）

```text
app/           # App Router：页面与布局
components/    # React 组件；文件名为 PascalCase，与导出名一致（例：QueryConsole.tsx）
api/           # 浏览器端 API 调用（非 Route Handler）
config/        # 与前.env 相关的读取函数（无秘密逻辑）
constants/     # 纯常量（示例文案等）
types/         # TypeScript 类型（与后端契约对齐）
utils/         # 无业务含义的工具函数（格式化、URL 等）
lib/utils.ts   # `cn()` 等，供 shadcn CLI（components.json）使用
```

## Run

```bash
cd frontend
npm install
npm run dev
```

## Test

```bash
npm run test
```

## 联调 Nest（`backend/`）

1. 启动 API（避免与 Next 抢端口，建议 API 用 3001）：

   ```bash
   cd ../backend
   PORT=3001 npm run start:dev
   ```

2. 在 `frontend/.env.local` 配置（见 `.env.example`）：

   - **经 Next 代理（默认）**：只设 `BACKEND_PROXY_TARGET=http://127.0.0.1:3001`。浏览器请求 `/po1ymarket/...`，由 Next 转发到 Nest。
   - **直连（可选）**：`NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3001`（不走 `/po1ymarket`）。

3. 重启 `npm run dev`。

**没有内置 mock 数据集**；未设 `BACKEND_PROXY_TARGET` 时，代理路径会 404，控制台会显示 API 错误信息。
