import { expect, test, type Page } from '@playwright/test';

async function runPipeline(page: Page, product: string, mode: string, clientIp: string) {
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': clientIp });
  await page.goto('/pipeline-lab');
  await page.getByLabel('Product').selectOption(product);
  await page.getByLabel('Suite').selectOption('REGRESSION');
  await page.getByLabel('Execution mode').selectOption(mode);
  await page.getByRole('button', { name: 'Run demo pipeline' }).click();
  await expect(page.locator('code').first()).not.toBeEmpty();
  await expect(page.getByRole('heading', { name: 'Pipeline result' })).toBeVisible({ timeout: 150_000 });
}

test.describe.serial('hosted production smoke', () => {
  test('ServiceDesk Success persists a real Playwright report before the UI browser starts', async ({ request }) => {
    const created = await request.post('/api/demo/runs', {
      data: { product: 'servicedesk', suite: 'REGRESSION', mode: 'SUCCESS' },
      headers: { 'x-forwarded-for': '198.51.100.13' }
    });
    expect(created.status()).toBe(202);
    const runId = (await created.json()).run.runId as string;
    await expect.poll(async () => {
      const response = await request.get(`/api/demo/runs/${runId}`);
      return (await response.json()).run.state;
    }, { timeout: 150_000 }).toBe('COMPLETED');
    const runResponse = await request.get(`/api/demo/runs/${runId}`);
    const executionId = (await runResponse.json()).run.executionId as string;
    const details = await request.get(`/api/executions/${executionId}`);
    expect(details.status()).toBe(200);
    expect((await details.json()).execution).toMatchObject({
      productKey: 'servicedesk', reportFormat: 'playwright-json-v1', status: 'PASSED', summary: { executed: 5, passed: 5 }
    });
  });

  test('ShopSphere Success persists and opens execution details', async ({ page }) => {
    await runPipeline(page, 'shopsphere', 'SUCCESS', '198.51.100.11');
    await expect(page.getByText('PASSED', { exact: true }).last()).toBeVisible();
    await page.getByRole('link', { name: 'View execution' }).click();
    await expect(page.getByRole('heading', { name: 'ShopSphere execution' })).toBeVisible();
    await expect(page.getByText('mochawesome', { exact: true })).toBeVisible();
  });

  test('ShopSphere Functional Failure updates Dashboard and Regression Delta', async ({ page }) => {
    await runPipeline(page, 'shopsphere', 'FUNCTIONAL_FAILURE', '198.51.100.12');
    await expect(page.getByText('FAILED', { exact: true }).last()).toBeVisible();
    await page.goto('/');
    await expect(page.locator('.product-card').filter({ hasText: 'ShopSphere' })).toContainText('FAILED');
    await page.goto('/products/shopsphere');
    const delta = page.locator('section.panel').filter({ has: page.getByRole('heading', { name: 'Regression delta' }) });
    await expect(delta).toContainText('New failures');
    await expect(delta).toContainText('1');
  });

  test('PocketWallet Infrastructure Failure remains an explicit zero-execution error', async ({ page }) => {
    await runPipeline(page, 'pocketwallet', 'INFRASTRUCTURE_FAILURE', '198.51.100.14');
    await expect(page.getByText(/Infrastructure error/)).toBeVisible();
    await expect(page.getByText('Executed').last().locator('..')).toContainText('0');
    await page.getByRole('link', { name: 'View execution' }).click();
    await expect(page.getByText(/MOBILE_HARNESS_DEMO startup was intentionally interrupted/)).toBeVisible();
  });

  test('serves all public views plus health and readiness from the compiled application', async ({ page, request }) => {
    for (const route of ['/', '/products', '/pipeline-lab', '/executions', '/platform-health']) {
      await page.goto(route);
      await expect(page.getByRole('heading').first()).toBeVisible();
    }
    expect((await request.get('/api/health')).status()).toBe(200);
    expect((await request.get('/api/readiness')).status()).toBe(200);
  });

  test('enforces visitor cooldown and a two-run concurrency ceiling', async ({ request }) => {
    const payload = { product: 'pocketwallet', suite: 'SMOKE', mode: 'SUCCESS' };
    const first = await request.post('/api/demo/runs', { data: payload, headers: { 'x-forwarded-for': '198.51.100.20' } });
    const repeated = await request.post('/api/demo/runs', { data: payload, headers: { 'x-forwarded-for': '198.51.100.20' } });
    expect(first.status()).toBe(202);
    expect(repeated.status()).toBe(429);
    const firstRunId = (await first.json()).run.runId as string;
    await expect.poll(async () => {
      const response = await request.get(`/api/demo/runs/${firstRunId}`);
      return (await response.json()).run.state;
    }, { timeout: 30_000 }).toBe('COMPLETED');

    const responses = await Promise.all(['21', '22', '23'].map((suffix) => request.post('/api/demo/runs', {
      data: payload,
      headers: { 'x-forwarded-for': `198.51.100.${suffix}` }
    })));
    expect(responses.map((response) => response.status()).sort()).toEqual([202, 202, 429]);
    expect((await responses.find((response) => response.status() === 429)?.json()).error)
      .toBe('Demo capacity reached. Try again shortly.');
  });
});
