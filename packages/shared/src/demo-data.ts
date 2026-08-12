import { productSchema, type Product } from './types';

const exampleProducts: Product[] = [
  {
    id: 'prod-shopsphere',
    name: 'ShopSphere',
    description: 'Fictional e-commerce platform',
    productKey: 'shopsphere',
    framework: 'Cypress',
    reportFormat: 'Mochawesome',
    status: 'ACTIVE',
    lastExecutionAt: '2026-08-12T06:15:00.000Z',
    branch: 'release/august',
    pipeline: 'shop-regression-318',
    freshness: 'FRESH',
    latestRegression: '2026-08-11T21:45:00.000Z',
    automationCoverage: 72,
    executionPolicy: {
      source: 'Push main',
      suiteType: 'Regression',
      official: true,
      freshnessTargetHours: 24
    },
    summary: {
      total: 140,
      executed: 128,
      passed: 118,
      failed: 6,
      skipped: 4,
      infrastructureErrors: 2,
      durationMs: 1840000,
      approvalRate: 92.2,
      qualityScore: 89.4
    }
  },
  {
    id: 'prod-servicedesk',
    name: 'ServiceDesk',
    description: 'Fictional support portal',
    productKey: 'servicedesk',
    framework: 'Playwright',
    reportFormat: 'Playwright JSON/JUnit',
    status: 'STALE',
    lastExecutionAt: '2026-08-09T15:30:00.000Z',
    branch: 'main',
    pipeline: 'support-e2e-154',
    freshness: 'STALE',
    latestRegression: '2026-08-08T17:15:00.000Z',
    automationCoverage: 68,
    executionPolicy: {
      source: 'Schedule',
      suiteType: 'E2E',
      official: true,
      freshnessTargetHours: 16
    },
    summary: {
      total: 116,
      executed: 92,
      passed: 82,
      failed: 9,
      skipped: 1,
      infrastructureErrors: 0,
      durationMs: 1650000,
      approvalRate: 89.1,
      qualityScore: 82.5
    }
  },
  {
    id: 'prod-pocketwallet',
    name: 'PocketWallet',
    description: 'Fictional mobile finance experience',
    productKey: 'pocketwallet',
    framework: 'Appium/WebdriverIO',
    reportFormat: 'mobile-e2e-json-v1',
    status: 'ACTIVE',
    lastExecutionAt: '2026-08-12T05:10:00.000Z',
    branch: 'release/mobile',
    pipeline: 'mobile-regression-42',
    freshness: 'FRESH',
    latestRegression: '2026-08-11T23:40:00.000Z',
    automationCoverage: 74,
    executionPolicy: {
      source: 'Manual',
      suiteType: 'Mobile',
      official: true,
      freshnessTargetHours: 12
    },
    summary: {
      total: 90,
      executed: 77,
      passed: 71,
      failed: 3,
      skipped: 2,
      infrastructureErrors: 1,
      durationMs: 2140000,
      approvalRate: 92.2,
      qualityScore: 91.1
    }
  }
];

export const demoProducts = exampleProducts.map((product) => productSchema.parse(product));

export const qualitySummary = {
  qualityScore: 87.4,
  approvalRate: 91.4,
  testsExecuted: 297,
  passed: 271,
  failed: 18,
  infrastructureErrors: 3,
  products: 3,
  productsWithRecentExecution: 2,
  productsStale: 1,
  automationCoverage: 71.3,
  latestRegression: '2026-08-11T21:45:00.000Z'
};
