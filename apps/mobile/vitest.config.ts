import { defineConfig } from 'vitest/config';

/** پیکربندی Vitest برای تست‌های واحد ابزارهای فارسی‌سازی */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
