import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/index.ts',
        'src/main.ts',
        'src/app.module.ts',
        // NestJS 모듈은 E2E 테스트 필요
        'src/modules/**/*.ts',
        'src/providers/**/*.ts',
        // 타입 정의 파일 (런타임 코드 없음)
        'src/types/**/*.ts',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
});
