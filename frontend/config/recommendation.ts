/**
 * Recommendation API — how `baseUrl` works
 *
 * The HTTP client builds the full endpoint as:
 *   `${baseUrl}/api/v1/recommendations`
 *
 * Default `baseUrl` is the **same-origin prefix** `/po1ymarket` (no host).
 * Example in the browser:
 *   fetch("/po1ymarket/api/v1/recommendations", ...)
 *
 * Next.js `rewrites` (see `next.config.ts`) map:
 *   /po1ymarket/:path*  →  BACKEND_PROXY_TARGET/:path*
 * So the above becomes a server-side forward to:
 *   BACKEND_PROXY_TARGET + "/api/v1/recommendations"
 * The real backend host never appears in client bundles if you only set `BACKEND_PROXY_TARGET`.
 *
 * Override for local/debug (browser talks directly to Nest; requires CORS):
 *   NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3001
 * Then `baseUrl` is that full origin and `/po1ymarket` is **not** used.
 */

/** Default prefix when not using `NEXT_PUBLIC_API_BASE_URL`. Must match `next.config.ts` rewrite source. */
export const DEFAULT_RECOMMENDATIONS_API_BASE_URL = "/po1ymarket";

/**
 * Returns the recommendation API **base URL** (prefix only): either `/po1ymarket` or a full origin.
 * Trailing slashes are stripped. Not the full path to `/api/v1/recommendations`.
 * Reads `NEXT_PUBLIC_*` on each call so Vitest can `vi.stubEnv`.
 */
export function getRecommendationsApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof raw === "string" && raw.trim()) return raw.replace(/\/$/, "");
  return DEFAULT_RECOMMENDATIONS_API_BASE_URL;
}
