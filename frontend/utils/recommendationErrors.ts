import { DEFAULT_RECOMMENDATIONS_API_BASE_URL } from "@/config/recommendation";

/**
 * 将推荐 API 的 HTTP 错误与当前 baseUrl 组合为面向操作者的说明（与 `frontend/README.md` 联调章节一致）。
 */
export function formatRecommendationsHttpError(
  status: number,
  baseUrl: string,
  serverMessage: string,
): string {
  const primary = serverMessage.trim() || `API 错误（${status}）`;

  if (status === 404 && isDefaultProxyBase(baseUrl)) {
    return `${primary}

未命中后端：当前请求走同源前缀「${DEFAULT_RECOMMENDATIONS_API_BASE_URL}」。请在 frontend/.env.local 设置 BACKEND_PROXY_TARGET（例如 http://127.0.0.1:3001）并重启 npm run dev；或设置 NEXT_PUBLIC_API_BASE_URL 直连 Nest。详见 frontend/README.md。`;
  }

  if (status >= 500) {
    return `${primary}

若刚启动后端，请确认 Nest 已监听且与代理目标端口一致。`;
  }

  return primary;
}

export function formatRecommendationsNetworkError(baseUrl: string, rawMessage: string): string {
  const msg = rawMessage.trim() || "网络错误";
  const isLikelyConnectivity =
    /failed to fetch|networkerror|load failed|network request failed/i.test(msg);

  if (!isLikelyConnectivity) {
    return `请求失败：${msg}`;
  }

  if (isDefaultProxyBase(baseUrl)) {
    return `网络或代理不可用：${msg}

请确认：1）backend 已启动；2）frontend/.env.local 中 BACKEND_PROXY_TARGET 指向该 API；3）已重启 Next 开发服务器。可选：设置 NEXT_PUBLIC_API_BASE_URL 直连（需 Nest 允许 CORS）。`;
  }

  return `网络不可用：${msg}

请确认 NEXT_PUBLIC_API_BASE_URL 可访问，且 Nest 已对该来源配置 CORS。`;
}

function isDefaultProxyBase(baseUrl: string): boolean {
  const normalized = baseUrl.replace(/\/$/, "");
  return normalized === DEFAULT_RECOMMENDATIONS_API_BASE_URL;
}
