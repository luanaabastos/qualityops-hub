import { demoProducts } from './demo-data.js';

const computeApproval = (passed: number, executed: number) => {
  if (executed === 0) return null;
  return Number(((passed / executed) * 100).toFixed(1));
};

const computeQualityScore = (passed: number, failed: number, infrastructureErrors: number, executed: number) => {
  if (executed === 0) return 0;
  const adjusted = passed - failed * 1.5 - infrastructureErrors * 2;
  return Number(Math.max(Math.min((Math.max(adjusted, 0) / executed) * 100, 100), 0).toFixed(1));
};

export const dashboardPayload = {
  qualityScore: 88.9,
  approvalRate: 93.5,
  testsExecuted: 110,
  passed: 103,
  failed: 5,
  infrastructureErrors: 1,
  products: 3,
  productsWithRecentExecution: 2,
  productsStale: 1,
  automationCoverage: null,
  latestRegression: '2026-08-11T21:45:00.000Z',
  productsSummary: demoProducts.map((product: (typeof demoProducts)[number]) => ({
    ...product,
    approvalRate: computeApproval(product.passed, product.executed),
    qualityScore: computeQualityScore(product.passed, product.failed, product.infrastructureErrors, product.executed)
  }))
};

export const productByKey = (key: string) => demoProducts.find((product: (typeof demoProducts)[number]) => product.key === key);

export const executionsForProduct = (key: string) => {
  const product = productByKey(key);
  if (!product) return [];

  return [
    { id: `${key}-latest`, productKey: key, date: product.lastExecutionAt, status: product.status, executed: product.executed, passed: product.passed, failed: product.failed, approval: product.approvalRate, duration: 1920000, source: 'Push main' },
    { id: `${key}-previous`, productKey: key, date: '2026-08-07T08:10:00.000Z', status: 'ACTIVE', executed: product.executed, passed: product.passed - 2, failed: product.failed + 2, approval: 91.3, duration: 2000000, source: 'Schedule' }
  ];
};
