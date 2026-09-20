import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  typedRoutes: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb"
    }
  },
  images: {
    unoptimized: true,
    localPatterns: [{ pathname: "/brand/**" }],
    remotePatterns: [
      { protocol: "https", hostname: "t.me" },
      { protocol: "https", hostname: "telegram.org" },
      { protocol: "https", hostname: "*.telegram.org" },
      { protocol: "https", hostname: "*.telegram-cdn.org" }
    ]
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        // Mini App must load inside Telegram Web (web.telegram.org iframe).
        // Do not set X-Frame-Options: SAMEORIGIN — it blocks that embed.
        {
          key: "Content-Security-Policy",
          value:
            "frame-ancestors 'self' https://web.telegram.org https://telegram.org https://k.telegram.org"
        },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()"
        },
        {
          key: "Cross-Origin-Opener-Policy",
          value: "same-origin-allow-popups"
        }
      ]
    }
  ],
  outputFileTracingRoot: path.resolve(process.cwd())
};

export default nextConfig;
