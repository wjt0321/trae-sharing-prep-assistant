import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 转译 monorepo 内的 workspace 包（@ai-task-manager/shared 提供 TypeScript 源码）
  transpilePackages: ["@ai-task-manager/shared"],
  // 后端 API 反向代理，避免开发期跨域
  async rewrites() {
    const serverBase = process.env.SERVER_BASE_URL ?? "http://localhost:4000";
    return [
      {
        source: "/api/server/:path*",
        destination: `${serverBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
