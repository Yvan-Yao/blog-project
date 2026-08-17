/**
 * @file vitest.config.js
 * @description Vitest 测试框架配置
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 顺序执行测试文件，避免数据库并发冲突
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true }
    },
    // 测试环境变量
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test_secret_key_vitest',
      JWT_EXPIRES_IN: '1h',
      DB_PATH: './data/test.db',
      ADMIN_SECRET: 'admin_register_secret_2024',
      PORT: '3002',
    },
    // 覆盖率报告配置
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/utils/seed.js'],
    },
  },
});
