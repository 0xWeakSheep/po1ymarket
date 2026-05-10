import type { NextConfig } from "next";

/**
 * Transparent reverse proxy for the browser-visible prefix `/po1ymarket`.
 *
 * Client calls e.g. `/po1ymarket/api/v1/recommendations`.
 * This strips `/po1ymarket` and forwards to `BACKEND_PROXY_TARGET/api/v1/recommendations`.
 *
 * `BACKEND_PROXY_TARGET` must be available when this config is evaluated (typically at build time).
 */
const nextConfig: NextConfig = {
  async rewrites() {
    const target = process.env.BACKEND_PROXY_TARGET?.trim();
    if (!target) return [];
    const base = target.replace(/\/$/, "");
    return [{ source: "/po1ymarket/:path*", destination: `${base}/:path*` }];
  },
};

export default nextConfig;
