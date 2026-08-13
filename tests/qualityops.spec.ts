import { expect, test } from '@playwright/test';

const routes = [
  '/',
  '/products',
  '/products/shopsphere',
  '/products/servicedesk',
  '/products/pocketwallet',
  '/executions',
  '/how-it-works',
  '/coverage',
  '/integrations',
  '/automation-plan',
  '/video-evidence',
  '/documentation',
  '/platform-health'
];

const viewports = [
  { name: 'desktop-large', width: 1440, height: 900 },
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'mobile-small', width: 320, height: 568 }
];

test.describe('QualityOps Hub checkpoint 3', () => {
  test('overview presents only labeled synthetic quality signals', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'QualityOps Hub' })).toBeVisible();
    await expect(page.getByText('DEMO DATA')).toBeVisible();
    await expect(page.getByText('Coverage not configured')).toBeVisible();
    await expect(page.getByText('ShopSphere')).toBeVisible();
    await expect(page.getByText('ServiceDesk')).toBeVisible();
    await expect(page.getByText('PocketWallet')).toBeVisible();
    await expect(page.getByText('Infrastructure Errors')).toBeVisible();
  });

  test('products inventory lists the three fictional products', async ({ page }) => {
    await page.goto('/products');

    await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ShopSphere' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ServiceDesk' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'PocketWallet' })).toBeVisible();
  });

  test('ShopSphere exposes Cypress, Mochawesome and stable regression delta', async ({ page }) => {
    await page.goto('/products/shopsphere');

    await expect(page.getByRole('heading', { name: 'ShopSphere' })).toBeVisible();
    await expect(page.getByText('Cypress', { exact: true })).toBeVisible();
    await expect(page.getByText('Mochawesome', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Regression delta' })).toBeVisible();
    await expect(page.getByText('Compared by stable scenario identity')).toBeVisible();
    await expect(page.getByText('Recovered tests')).toBeVisible();
    await expect(page.getByText('Persistent failures')).toBeVisible();
  });

  test('ServiceDesk makes stale state explicit', async ({ page }) => {
    await page.goto('/products/servicedesk');

    await expect(page.getByRole('heading', { name: 'ServiceDesk' })).toBeVisible();
    await expect(page.getByText('Playwright', { exact: true })).toBeVisible();
    await expect(page.getByText('STALE', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/latest synthetic execution is older/i)).toBeVisible();
  });

  test('PocketWallet shows a synthetic recovery after infrastructure error', async ({ page }) => {
    await page.goto('/products/pocketwallet');

    await expect(page.getByRole('heading', { name: 'PocketWallet' })).toBeVisible();
    await expect(page.getByText(/MOBILE HARNESS DEMO:/)).toBeVisible();
    await expect(page.getByText(/does not represent a real Android execution/i)).toBeVisible();
    await expect(page.getByText('INFRASTRUCTURE ERROR', { exact: true })).toBeVisible();
    await expect(page.getByText('PASSED', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Manual recovery')).toBeVisible();
  });

  test('executions filter passed, failed, stale and infrastructure outcomes', async ({ page }) => {
    await page.goto('/executions');
    const status = page.getByLabel('Status');

    for (const outcome of ['PASSED', 'FAILED', 'STALE', 'INFRASTRUCTURE_ERROR']) {
      await status.selectOption(outcome);
      await expect(page.locator('tbody tr').first()).toContainText(outcome.replaceAll('_', ' '));
    }
  });

  test('executions show an explicit empty state', async ({ page }) => {
    await page.goto('/executions');

    await page.getByLabel('Product').selectOption('pocketwallet');
    await page.getByLabel('Status').selectOption('FAILED');
    await expect(page.getByText('No executions match the selected filters.')).toBeVisible();
  });

  test('How it works explains the public processing flow', async ({ page }) => {
    await page.goto('/how-it-works');

    await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible();
    for (const step of ['Code change', 'GitHub Actions', 'Automated Tests', 'Test Report', 'Artifact', 'QualityOps API', 'Normalizer', 'Persistence', 'Dashboard']) {
      await expect(page.getByText(step, { exact: true })).toBeVisible();
    }
  });

  test('mobile drawer traps focus, closes with Escape and restores focus', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const menuButton = page.getByRole('button', { name: 'Open navigation' });
    const sidebar = page.getByLabel('Sidebar navigation');
    await expect(sidebar).not.toBeVisible();
    await menuButton.click();
    await expect(sidebar).toBeVisible();
    await expect(page.getByRole('link', { name: 'QualityOps Hub overview' })).toBeFocused();

    await page.getByRole('link', { name: 'Platform Health' }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'QualityOps Hub overview' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(sidebar).not.toBeVisible();
    await expect(menuButton).toBeFocused();
  });

  test('mobile drawer closes after navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('link', { name: 'Products', exact: true }).click();

    await expect(page).toHaveURL('/products');
    await expect(page.getByLabel('Sidebar navigation')).not.toBeVisible();
  });

  test('all required routes remain usable without page-level overflow', async ({ page }) => {
    test.setTimeout(120_000);

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const route of routes) {
        await page.goto(route);
        await expect(page.locator('main')).toBeVisible();
        const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(hasOverflow, `${route} overflowed at ${viewport.name}`).toBe(false);
      }
    }
  });

  test('invalid routes and product keys render handled errors', async ({ page }) => {
    await page.goto('/products/not-a-product');
    await expect(page.getByRole('heading', { name: 'Product not found' })).toBeVisible();

    await page.goto('/not-a-route');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });
});
