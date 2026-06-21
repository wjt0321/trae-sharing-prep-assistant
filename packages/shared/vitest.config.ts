import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 测试文件匹配规则
    include: ['src/**/*.test.ts'],
    // 运行环境：纯函数测试不需要 DOM
    environment: 'node',
    // 覆盖率收集（可选，通过 --coverage 启用）
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/index.ts'],
    },
  },
});
