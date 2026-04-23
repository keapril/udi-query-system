import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 關閉 Production Build 快取，避免大型 cache 檔案被上傳到 Cloudflare Pages
  webpack: (config, { dev }) => {
    if (!dev) {
      config.cache = false;
    }
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
