import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/**': ['./dev.db', './prisma/**/*'],
  },
};

// Refreshed Prisma client bindings
export default nextConfig;
