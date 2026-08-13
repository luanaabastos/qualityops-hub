import { defineConfig, devices } from '@playwright/test';

const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests-production',
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'playwright-report/production-results.json' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [{ name: 'production-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm start',
    url: `${baseURL}/api/readiness`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: String(port),
      PUBLIC_APP_URL: baseURL,
      API_BASE_URL: baseURL,
      DEMO_PIPELINE_LAB_ENABLED: 'true',
      DEMO_SYSTEM_TOKEN: 'HOSTED_TEST_ONLY_CREDENTIAL_PLACEHOLDER',
      DEMO_RATE_LIMIT_MAX: '20',
      DEMO_RATE_LIMIT_WINDOW_MS: '60000',
      DEMO_RUN_COOLDOWN_MS: '60000',
      DEMO_MAX_CONCURRENT_RUNS: '2',
      DEMO_RUN_TIMEOUT_MS: '120000'
    }
  }
});
