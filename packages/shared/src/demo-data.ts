export const fictionalProducts = [
  { key: 'shopsphere', name: 'ShopSphere', framework: 'Cypress', reportFormat: 'mochawesome', freshnessTargetHours: 24 },
  { key: 'servicedesk', name: 'ServiceDesk', framework: 'Playwright', reportFormat: 'playwright-json-v1', freshnessTargetHours: 16 },
  { key: 'pocketwallet', name: 'PocketWallet', framework: 'MOBILE_HARNESS_DEMO', reportFormat: 'mobile-e2e-json-v1', freshnessTargetHours: 12 }
] as const;

export const demoAutomationCoverage = [
  { productKey: 'shopsphere', productName: 'ShopSphere', eligible: 18, automated: 14 },
  { productKey: 'servicedesk', productName: 'ServiceDesk', eligible: 12, automated: 9 },
  { productKey: 'pocketwallet', productName: 'PocketWallet', eligible: 10, automated: 5 }
] as const;

const eligible = demoAutomationCoverage.reduce((total, product) => total + product.eligible, 0);
const automated = demoAutomationCoverage.reduce((total, product) => total + product.automated, 0);

export const demoAutomationCoverageSummary = {
  eligible,
  automated,
  remaining: eligible - automated,
  percentage: Number(((automated / eligible) * 100).toFixed(1))
} as const;
