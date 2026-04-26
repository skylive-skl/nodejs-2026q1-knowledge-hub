import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    exclude: ['test/**', 'dist/**', 'node_modules/**'],
    passWithNoTests: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/**/*.service.ts',
        'src/**/guards/*.guard.ts',
        'src/**/strategies/*.strategy.ts',
        'src/**/dto/*.ts',
        'src/common/pagination.ts',
        'src/users/users.entity.ts',
      ],
      exclude: ['src/**/*.spec.ts', 'src/**/*.controller.ts', 'src/**/*.module.ts'],
      thresholds: {
        lines: 90,
        branches: 85,
      },
    },
  },
});
