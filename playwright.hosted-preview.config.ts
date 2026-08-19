import { defineConfig, devices } from '@playwright/test';

const port = 3200;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests-hosted-preview',
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [{ name: 'hosted-preview-chromium', use: { ...devices['Desktop Chrome'] } }],
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
      DEMO_RUNNER_MODE: 'hosted-preview',
      DEMO_RATE_LIMIT_MAX: '20',
      DEMO_RATE_LIMIT_WINDOW_MS: '60000',
      DEMO_RUN_COOLDOWN_MS: '0'
    }
  }
});
