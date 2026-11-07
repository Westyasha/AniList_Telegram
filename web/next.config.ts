import type { NextConfig } from "next";
import pkg from "./package.json" with { type: "json" };

const backend = (process.env.BACKEND_URL ?? "http://127.0.0.1:8090").replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  reactStrictMode: true,
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "s4.anilist.co", pathname: "/file/**" },
      { protocol: "https", hostname: "img.anili.st", pathname: "/**" },
    ],
    qualities: [70, 80],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 640, 828, 1080, 1280, 1920],
    imageSizes: [48, 64, 96, 128, 160, 256, 384],
    minimumCacheTTL: 86400,
  },
  async headers() {
    return [
      {
        source: "/auth/:path(confirm|result)",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/auth/login", destination: `${backend}/auth/login` },
      { source: "/auth/callback", destination: `${backend}/auth/callback` },
    ];
  },
};

export default nextConfig;
