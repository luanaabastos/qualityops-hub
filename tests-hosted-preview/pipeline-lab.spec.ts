import { expect, test } from '@playwright/test';

test('labels and completes the hosted flow without an official execution', async ({ page, request }) => {
  const config = await request.get('/api/demo/config');
  expect(config.ok()).toBe(true);
  expect(await config.json()).toEqual({
    enabled: true,
    runnerMode: 'hosted-preview',
    externalCiStatus: 'EXTERNAL_CI_INTEGRATION_PENDING'
  });

  await page.goto('/pipeline-lab');
  await expect(page.getByText(/Official CI is not configured yet/)).toBeVisible();
  await expect(page.getByText(/without starting Cypress or Playwright/)).toBeVisible();
  await page.getByRole('button', { name: 'Preview pipeline flow' }).click();
  await expect(page.getByRole('heading', { name: 'Hosted preview complete' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('No official execution was created.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'View execution' })).toHaveCount(0);
});
