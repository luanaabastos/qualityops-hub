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
    pipeline: 'shopsphere-regression-318',
    freshness: 'FRESH',
    latestRegression: '2026-08-11T21:45:00.000Z',
    automationCoverage: null,
    executionPolicy: {
      source: 'Push main',
      suiteType: 'Regression',
      official: true,
      freshnessTargetHours: 24
    },
    summary: {
      total: 46,
      executed: 46,
      passed: 43,
      failed: 3,
      skipped: 0,
      infrastructureErrors: 0,
      durationMs: 1840000,
      approvalRate: 93.5,
      qualityScore: 83.7
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
    lastExecutionAt: '2026-07-21T15:40:00.000Z',
    branch: 'main',
    pipeline: 'servicedesk-e2e-154',
    freshness: 'STALE',
    latestRegression: '2026-08-08T17:15:00.000Z',
    automationCoverage: null,
    executionPolicy: {
      source: 'Schedule',
      suiteType: 'E2E',
      official: true,
      freshnessTargetHours: 16
    },
    summary: {
      total: 32,
      executed: 32,
      passed: 30,
      failed: 2,
      skipped: 0,
      infrastructureErrors: 0,
      durationMs: 1650000,
      approvalRate: 93.8,
      qualityScore: 84.4
    }
  },
  {
    id: 'prod-pocketwallet',
    name: 'PocketWallet',
    description: 'Fictional mobile harness recovery demonstration',
    productKey: 'pocketwallet',
    framework: 'Mobile Harness Demo',
    reportFormat: 'Synthetic mobile JSON',
    status: 'ACTIVE',
    lastExecutionAt: '2026-08-12T07:20:00.000Z',
    branch: 'release/mobile',
    pipeline: 'pocketwallet-mobile-42',
    freshness: 'FRESH',
    latestRegression: '2026-08-11T23:40:00.000Z',
    automationCoverage: null,
    executionPolicy: {
      source: 'Manual',
      suiteType: 'Mobile',
      official: true,
      freshnessTargetHours: 12
    },
    summary: {
      total: 18,
      executed: 18,
      passed: 18,
      failed: 0,
      skipped: 0,
      infrastructureErrors: 0,
      durationMs: 1160000,
      approvalRate: 100,
      qualityScore: 100
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
  automationCoverage: null,
  latestRegression: '2026-08-11T21:45:00.000Z'
};
