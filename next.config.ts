import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Fix for TLS certificate issues when fetching Google Fonts in some environments
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
