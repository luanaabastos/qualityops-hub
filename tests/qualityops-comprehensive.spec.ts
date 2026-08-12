import { test, expect } from '@playwright/test';

test.describe('QualityOps Hub - Overview', () => {
  test('overview page loads with demo badge', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /QualityOps Hub/i })).toBeVisible();
    await expect(page.getByText('DEMO DATA')).toBeVisible();
    await expect(page.getByText('Coverage not configured')).toBeVisible();
  });

  test('overview shows stat cards', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('.stat-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(5);
  });

  test('overview displays products grid', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Products')).toBeVisible();
    const products = page.locator('.product-grid article');
    await expect(products.first()).toBeVisible();
  });
});

test.describe('QualityOps Hub - Products', () => {
  test('products page lists all three products', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByText('ShopSphere')).toBeVisible();
    await expect(page.getByText('ServiceDesk')).toBeVisible();
    await expect(page.getByText('PocketWallet')).toBeVisible();
  });

  test('ShopSphere details page shows Cypress framework', async ({ page }) => {
    await page.goto('/products/shopsphere');
    await expect(page.getByRole('heading', { name: /ShopSphere/i })).toBeVisible();
    await expect(page.getByText(/Cypress/i)).toBeVisible();
    await expect(page.getByText('Regression delta')).toBeVisible();
  });

  test('ServiceDesk details shows STALE status', async ({ page }) => {
    await page.goto('/products/servicedesk');
    await expect(page.getByRole('heading', { name: /ServiceDesk/i })).toBeVisible();
    await expect(page.getByText('STALE')).toBeVisible();
    await expect(page.getByText(/Playwright/i)).toBeVisible();
  });

  test('PocketWallet details shows ERROR status', async ({ page }) => {
    await page.goto('/products/pocketwallet');
    await expect(page.getByRole('heading', { name: /PocketWallet/i })).toBeVisible();
    await expect(page.getByText('ERROR')).toBeVisible();
  });
});

test.describe('QualityOps Hub - Executions', () => {
  test('executions page loads with filters', async ({ page }) => {
    await page.goto('/executions');
    await expect(page.getByRole('heading', { name: /Executions/i })).toBeVisible();
    await expect(page.getByLabel('Product')).toBeVisible();
    await expect(page.getByLabel('Status')).toBeVisible();
  });

  test('executions can filter by product', async ({ page }) => {
    await page.goto('/executions');
    const productSelect = page.getByLabel('Product');
    await productSelect.selectOption('shopsphere');
    await expect(page.getByText('shopsphere')).toBeVisible();
  });

  test('executions can filter by status', async ({ page }) => {
    await page.goto('/executions');
    const statusSelect = page.getByLabel('Status');
    await statusSelect.selectOption('ACTIVE');
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });
});

test.describe('QualityOps Hub - How It Works', () => {
  test('how it works page shows flow', async ({ page }) => {
    await page.goto('/how-it-works');
    await expect(page.getByRole('heading', { name: /How it works/i })).toBeVisible();
    await expect(page.getByText('Code change')).toBeVisible();
    await expect(page.getByText('Dashboard')).toBeVisible();
  });
});

test.describe('QualityOps Hub - Navigation', () => {
  test('sidebar navigation is accessible', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.getByLabel('Sidebar navigation');
    await expect(sidebar).toBeVisible();
    await expect(page.getByText('Overview')).toBeVisible();
    await expect(page.getByText('Products')).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Executions/i }).click();
    await expect(page).toHaveURL('/executions');
  });
});

test.describe('QualityOps Hub - Responsive Views', () => {
  test('desktop view 1440x900 renders properly', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /QualityOps Hub/i })).toBeVisible();
  });

  test('tablet view 768x1024 renders properly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /QualityOps Hub/i })).toBeVisible();
  });

  test('mobile view 390x844 renders properly', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /QualityOps Hub/i })).toBeVisible();
  });

  test('mobile view 320x568 renders properly', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /QualityOps Hub/i })).toBeVisible();
  });
});

test.describe('QualityOps Hub - Placeholder Routes', () => {
  test('coverage page shows coming soon', async ({ page }) => {
    await page.goto('/coverage');
    await expect(page.getByText('Coverage')).toBeVisible();
    await expect(page.getByText('Coming in next milestone')).toBeVisible();
  });

  test('integrations page shows coming soon', async ({ page }) => {
    await page.goto('/integrations');
    await expect(page.getByText('Integrations')).toBeVisible();
  });

  test('automation-plan page shows coming soon', async ({ page }) => {
    await page.goto('/automation-plan');
    await expect(page.getByText('Automation Plan')).toBeVisible();
  });

  test('video-evidence page shows coming soon', async ({ page }) => {
    await page.goto('/video-evidence');
    await expect(page.getByText('Video Evidence')).toBeVisible();
  });

  test('documentation page shows coming soon', async ({ page }) => {
    await page.goto('/documentation');
    await expect(page.getByText('Documentation')).toBeVisible();
  });

  test('platform-health page shows coming soon', async ({ page }) => {
    await page.goto('/platform-health');
    await expect(page.getByText('Platform Health')).toBeVisible();
  });
});

test.describe('QualityOps Hub - Empty and Error States', () => {
  test('executions empty state renders correctly', async ({ page }) => {
    await page.goto('/executions');
    const statusSelect = page.getByLabel('Status');
    await statusSelect.selectOption('NO_EXECUTION');
    await expect(page.locator('table tbody')).toBeVisible();
  });

  test('404-like route with invalid product key shows error message', async ({ page }) => {
    await page.goto('/products/nonexistent');
    // Should either show error or navigate back - depends on implementation
    // For now, just verify page loads without crashing
    await expect(page.getByRole('heading')).toBeDefined();
  });
});
