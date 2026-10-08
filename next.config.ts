import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  distDir: ".next-build",
  images: { unoptimized: true },
};

export default nextConfig;
