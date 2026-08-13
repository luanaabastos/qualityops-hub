import path from 'node:path';
import { defineConfig } from '@playwright/test';

const artifactDirectory = process.env.DEMO_ARTIFACT_DIR ?? path.resolve('artifacts', 'demo-runs', 'manual-servicedesk');

export default defineConfig({
  testDir: '.',
  testMatch: 'servicedesk.spec.ts',
  outputDir: path.join(artifactDirectory, 'playwright-output'),
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
