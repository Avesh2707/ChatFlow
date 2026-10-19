import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
  async rewrites() {
    const internalApiUrl = process.env.INTERNAL_API_URL?.trim();
    if (!internalApiUrl) {
      return [];
    }
    const cleanUrl = internalApiUrl.replace(/\/$/, "");
    return {
      beforeFiles: [],
      // afterFiles are checked after pages and local route handlers (like /api/health)
      afterFiles: [
        {
          source: "/api/:path*",
          destination: `${cleanUrl}/api/:path*`,
        },
      ],
      fallback: [],
    };
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
