import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/**': ['./dev.db', './prisma/**/*'],
  },
};

export default nextConfig;
