import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@scrapify/db"],
};

export default nextConfig;
