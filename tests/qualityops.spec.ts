import { test, expect } from '@playwright/test';

test.describe('QualityOps Hub demo', () => {
  test('overview loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /QualityOps Hub/i })).toBeVisible();
    await expect(page.getByText('Coverage not configured')).toBeVisible();
  });

  test('shows product details', async ({ page }) => {
    await page.goto('/products/shopsphere');
    await expect(page.getByRole('heading', { name: /ShopSphere/i })).toBeVisible();
    await expect(page.getByText(/Cypress/i)).toBeVisible();
  });

  test('shows executions page', async ({ page }) => {
    await page.goto('/executions');
    await expect(page.getByRole('heading', { name: /Executions/i })).toBeVisible();
  });

  test('shows how it works', async ({ page }) => {
    await page.goto('/how-it-works');
    await expect(page.getByRole('heading', { name: /How it works/i })).toBeVisible();
  });

  test('mobile drawer can open', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByLabel('Sidebar navigation')).toBeVisible();
  });
});
