import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => page.goto('/demo-targets/servicedesk.html'));

test('opens a fictional ticket', async ({ page }) => {
  await page.getByLabel('Ticket title').fill('Demo request');
  await page.getByRole('button', { name: 'Open ticket' }).click();
  await expect(page.locator('#state')).toHaveText('Ticket opened');
});

test('edits a fictional ticket', async ({ page }) => {
  await page.getByLabel('Description').fill('Updated demo detail');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('#state')).toHaveText('Ticket updated');
});

test('changes ticket priority', async ({ page }) => {
  await page.getByLabel('Priority').selectOption('High');
  const expected = process.env.DEMO_MODE === 'FUNCTIONAL_FAILURE' ? 'Priority: Critical' : 'Priority: High';
  await expect(page.locator('#state')).toHaveText(expected);
});

test('resolves a fictional ticket', async ({ page }) => {
  await page.getByRole('button', { name: 'Resolve ticket' }).click();
  await expect(page.locator('#state')).toHaveText('Ticket resolved');
});

test('filters resolved tickets', async ({ page }) => {
  await page.getByLabel('Filter tickets').selectOption('Resolved');
  await expect(page.locator('#state')).toHaveText('Filter: Resolved');
});
