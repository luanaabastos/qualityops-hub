import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'servicedesk.spec.ts',
  timeout: 20_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['./reporter.ts']],
  use: {
    baseURL: process.env.DEMO_TARGET_URL ?? 'http://127.0.0.1:5173',
    headless: true,
    trace: 'off',
    screenshot: 'off',
    video: 'off'
  }
});
