import { expect, test, type Page } from '@playwright/test';

const localDemoCooldownMs = 10_000;
let lastDemoSubmissionAt = 0;

async function runPipeline(page: Page, product: string, mode: string) {
  await page.goto('/pipeline-lab');
  await page.getByLabel('Product').selectOption(product);
  await page.getByLabel('Suite').selectOption('REGRESSION');
  await page.getByLabel('Execution mode').selectOption(mode);
  const remainingCooldown = lastDemoSubmissionAt + localDemoCooldownMs - Date.now();
  if (remainingCooldown > 0) await page.waitForTimeout(remainingCooldown + 250);
  await page.getByRole('button', { name: 'Run demo pipeline' }).click();
  lastDemoSubmissionAt = Date.now();
  await expect(page.locator('code').first()).not.toBeEmpty();
  await expect(page.getByRole('heading', { name: 'Pipeline result' })).toBeVisible({ timeout: 120_000 });
}

test.describe.serial('TestOps Hub live pipeline', () => {
  test.setTimeout(150_000);

  test('Pipeline Lab runs a real ShopSphere Cypress success and opens persisted details', async ({ page }) => {
    await runPipeline(page, 'shopsphere', 'SUCCESS');
    await expect(page.getByText('ShopSphere', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('PASSED', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('Executed').last().locator('..')).toContainText('5');
    await page.getByRole('link', { name: 'View execution' }).click();
    await expect(page.getByRole('heading', { name: 'ShopSphere execution' })).toBeVisible();
    await expect(page.getByText('Mochawesome', { exact: true })).toBeVisible();
    await expect(page.getByText('Local Demo', { exact: true })).toBeVisible();
    await expect(page.getByText('adds an item to the cart', { exact: true })).toBeVisible();
    const metadata = page.locator('section.panel').filter({ has: page.getByRole('heading', { name: 'Artifacts and evidence' }) });
    await expect(metadata.getByRole('button', { name: 'Copy Pipeline ID' })).toBeVisible();
  });

  test('ShopSphere functional failure updates dashboard and regression delta', async ({ page }) => {
    await runPipeline(page, 'shopsphere', 'FUNCTIONAL_FAILURE');
    await expect(page.getByText('FAILED', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('Failed').last().locator('..')).toContainText('1');
    await page.goto('/');
    const card = page.locator('.product-card').filter({ hasText: 'ShopSphere' });
    await expect(card).toContainText('FAILED');
    await expect(card).toContainText('Local Demo');
    await page.goto('/products/shopsphere');
    const delta = page.locator('section.panel').filter({ has: page.getByRole('heading', { name: 'Regression Delta' }) });
    await expect(delta).toContainText('New failures');
    await expect(delta).toContainText('1');
  });

  test('PocketWallet infrastructure mode is an explicit harness error with zero execution', async ({ page }) => {
    await runPipeline(page, 'pocketwallet', 'INFRASTRUCTURE_FAILURE');
    await expect(page.getByText('Infrastructure error — tests did not execute')).toBeVisible();
    await expect(page.getByText('Executed').last().locator('..')).toContainText('0');
    await expect(page.getByText('Errors').last().locator('..')).toContainText('1');
    await page.getByRole('link', { name: 'View execution' }).click();
    await expect(page.getByText('Infrastructure errors', { exact: true }).locator('..')).toContainText('1');
    await expect(page.getByText(/No tests executed because this run ended before browser assertions started/)).toBeVisible();
    await expect(page.getByText(/MOBILE_HARNESS_DEMO startup was intentionally interrupted/)).toBeVisible();
    await expect(page.getByText(/Android device was used/)).toBeVisible();
  });

  test('Platform Health reports live dependencies without a false object-storage status', async ({ page }) => {
    await page.goto('/platform-health');
    const services = page.locator('section.panel');
    await expect(services).toContainText('API');
    await expect(services).toContainText('Database');
    await expect(services).toContainText('Browser execution');
    await expect(services).toContainText('Hosted runner');
    await expect(services).toContainText('Object storage');
    await expect(services.getByText('operational', { exact: true })).toBeVisible();
    await expect(services.getByText('connected', { exact: true })).toBeVisible();
  });
});

test.describe('TestOps Hub portfolio presentation', () => {
  test('explains the product, evidence sources and execution traceability in plain language', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Automated test results, in one place.' })).toBeVisible();
    await expect(page.getByText('From CI test execution to actionable quality insights.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Why TestOps Hub?' })).toBeVisible();
    await expect(page.getByText('Official CI', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Hosted Preview', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Demo Data', { exact: true }).first()).toBeVisible();

    const qualityHelp = page.getByRole('button', { name: /Quality Score: Current quality indicator/ });
    await qualityHelp.focus();
    await expect(page.getByRole('tooltip').filter({ hasText: 'Current quality indicator' })).toBeVisible();

    await page.goto('/products');
    for (const column of ['Framework', 'Data source', 'Evidence', 'Last official CI']) {
      await expect(page.getByRole('columnheader', { name: column })).toBeVisible();
    }

    await page.goto('/executions');
    for (const column of ['Run time', 'Framework', 'Branch', 'Data source', 'Evidence']) {
      await expect(page.getByRole('columnheader', { name: column })).toBeVisible();
    }
    await page.getByRole('link', { name: 'View execution' }).first().click();
    for (const heading of ['Execution summary', 'Test results', 'Regression Delta', 'Artifacts and evidence']) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }

    await page.goto('/how-it-works');
    for (const heading of ['Evidence is spread across tools', 'From CI to one quality view', 'Browsers run in GitHub Actions', 'The source is always visible']) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
  });

  test('Coverage explains the demo model and keeps it separate from approval', async ({ page }) => {
    await page.goto('/coverage');
    await expect(page.getByRole('heading', { name: 'Automation Coverage' })).toBeVisible();
    await expect(page.getByText('70%', { exact: true })).toBeVisible();
    await expect(page.getByText('28 of 40 mapped quality scenarios')).toBeVisible();
    await expect(page.getByText('Automation Coverage is not code coverage or approval.')).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveCount(4);
  });

  test('Automation Plan filters representative scenarios and has an honest import roadmap', async ({ page }) => {
    await page.goto('/automation-plan');
    await expect(page.getByRole('heading', { name: 'Automation Plan' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Import CSV\/XLSX/ })).toBeDisabled();
    await page.getByLabel('Product').selectOption('shopsphere');
    await page.getByLabel('Status').selectOption('NOT_ELIGIBLE');
    await expect(page.getByText('No scenarios match the selected filters.')).toBeVisible();
    await page.getByLabel('Status').selectOption('AUTOMATED');
    await expect(page.getByText('SS-001')).toBeVisible();
  });

  test('Integrations, Documentation and Video Evidence are complete demo views', async ({ page }) => {
    await page.goto('/integrations');
    await expect(page.getByRole('heading', { name: 'Integrations' })).toBeVisible();
    await expect(page.getByText('Product token')).toHaveCount(3);
    await expect(page.getByText('Authenticated ingestion')).toBeVisible();

    await page.goto('/documentation');
    await expect(page.getByRole('heading', { name: 'Docs' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Report adapters' })).toBeVisible();
    await expect(page.getByText('Troubleshooting', { exact: true })).toHaveCount(6);

    await page.goto('/video-evidence');
    await expect(page.getByRole('heading', { name: 'Video Evidence' })).toBeVisible();
    await expect(page.getByText('DEMO PREVIEW', { exact: true })).toHaveCount(4);
    await expect(page.getByText(/persistent object storage are planned/)).toBeVisible();
  });

  test('key routes do not create page-level horizontal overflow at required viewports', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1280, height: 720 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
      { width: 320, height: 568 }
    ];
    const routes = [
      '/',
      '/pipeline-lab',
      '/products',
      '/products/shopsphere',
      '/executions',
      '/coverage',
      '/integrations',
      '/automation-plan',
      '/video-evidence',
      '/documentation',
      '/how-it-works',
      '/platform-health'
    ];
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      for (const route of routes) {
        await page.goto(route);
        await expect(page.getByRole('heading').first()).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${route} at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(0);
      }
    }
  });

  test('execution pagination is bounded and the mobile drawer restores keyboard focus', async ({ page }) => {
    await page.goto('/executions');
    await expect(page.getByText(/Showing 1–10 of \d+/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const menu = page.getByRole('button', { name: 'Open navigation' });
    await menu.focus();
    await menu.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Sidebar navigation' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeFocused();
  });

  test('primary pages expose semantic headings, labeled controls and visible keyboard focus', async ({ page }) => {
    const routes = [
      '/',
      '/pipeline-lab',
      '/products',
      '/executions',
      '/coverage',
      '/integrations',
      '/automation-plan',
      '/video-evidence',
      '/documentation',
      '/how-it-works',
      '/platform-health'
    ];

    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('h1')).toHaveCount(1);
      const headingLevels = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll((headings) => (
        headings.map((heading) => Number(heading.tagName.slice(1)))
      ));
      expect(headingLevels[0], `${route} starts with h1`).toBe(1);
      headingLevels.slice(1).forEach((level, index) => {
        expect(level - headingLevels[index], `${route} heading order`).toBeLessThanOrEqual(1);
      });

      const unnamedControls = await page.locator('button, select, input, textarea').evaluateAll((controls) => (
        controls.filter((control) => {
          const element = control as HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
          const labels = 'labels' in element ? element.labels : null;
          return !element.getAttribute('aria-label')
            && !element.getAttribute('aria-labelledby')
            && !element.textContent?.trim()
            && (!labels || labels.length === 0);
        }).map((control) => control.outerHTML)
      ));
      expect(unnamedControls, `${route} labeled controls`).toEqual([]);
    }

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
    const focusStyle = await skipLink.evaluate((element) => {
      const style = getComputedStyle(element);
      return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
    });
    expect(focusStyle.outlineStyle).not.toBe('none');
    expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(3);
  });
});
