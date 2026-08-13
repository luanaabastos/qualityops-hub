import { expect, test, type Page } from '@playwright/test';

async function runPipeline(page: Page, product: string, mode: string) {
  await page.goto('/pipeline-lab');
  await page.getByLabel('Product').selectOption(product);
  await page.getByLabel('Suite').selectOption('REGRESSION');
  await page.getByLabel('Execution mode').selectOption(mode);
  await page.getByRole('button', { name: 'Run demo pipeline' }).click();
  await expect(page.locator('code').first()).not.toBeEmpty();
  await expect(page.getByRole('heading', { name: 'Pipeline result' })).toBeVisible({ timeout: 120_000 });
}

test.describe.serial('QualityOps Hub checkpoint 4 live pipeline', () => {
  test.setTimeout(150_000);

  test('Pipeline Lab runs a real ShopSphere Cypress success and opens persisted details', async ({ page }) => {
    await runPipeline(page, 'shopsphere', 'SUCCESS');
    await expect(page.getByText('ShopSphere', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('PASSED', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('Executed').last().locator('..')).toContainText('5');
    await page.getByRole('link', { name: 'View execution' }).click();
    await expect(page.getByRole('heading', { name: 'ShopSphere execution' })).toBeVisible();
    await expect(page.getByText('mochawesome', { exact: true })).toBeVisible();
    await expect(page.getByText('Live demo run', { exact: true })).toBeVisible();
    await expect(page.getByText('adds an item to the cart', { exact: true })).toBeVisible();
  });

  test('ShopSphere functional failure updates dashboard and regression delta', async ({ page }) => {
    await runPipeline(page, 'shopsphere', 'FUNCTIONAL_FAILURE');
    await expect(page.getByText('FAILED', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('Failed').last().locator('..')).toContainText('1');
    await page.goto('/');
    const card = page.locator('.product-card').filter({ hasText: 'ShopSphere' });
    await expect(card).toContainText('FAILED');
    await expect(card).toContainText('Live demo run');
    await page.goto('/products/shopsphere');
    const delta = page.locator('section.panel').filter({ has: page.getByRole('heading', { name: 'Regression delta' }) });
    await expect(delta).toContainText('New failures');
    await expect(delta).toContainText('1');
  });

  test('PocketWallet infrastructure mode is an explicit harness error with zero execution', async ({ page }) => {
    await runPipeline(page, 'pocketwallet', 'INFRASTRUCTURE_FAILURE');
    await expect(page.getByText('Infrastructure error — tests did not execute')).toBeVisible();
    await expect(page.getByText('Executed').last().locator('..')).toContainText('0');
    await expect(page.getByText('Errors').last().locator('..')).toContainText('1');
    await page.getByRole('link', { name: 'View execution' }).click();
    await expect(page.getByText('No execution', { exact: true })).toBeVisible();
    await expect(page.getByText(/MOBILE_HARNESS_DEMO startup was intentionally interrupted/)).toBeVisible();
    await expect(page.getByText(/Android device was used/)).toBeVisible();
  });
});
