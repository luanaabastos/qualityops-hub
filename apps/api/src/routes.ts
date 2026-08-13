import { demoProducts } from './demo-data.js';

type ComparisonCase = {
  scenarioId: string;
  status: 'PASSED' | 'FAILED';
};

export type RegressionDelta = {
  newFailures: number;
  recoveredTests: number;
  persistentFailures: number;
  newTests: number;
};

const isFailure = (status: ComparisonCase['status']) => status === 'FAILED';

export const calculateRegressionDelta = (
  previous: ComparisonCase[],
  current: ComparisonCase[]
): RegressionDelta => {
  const previousById = new Map(previous.map((testCase) => [testCase.scenarioId, testCase]));

  return current.reduce<RegressionDelta>((delta, testCase) => {
    const previousCase = previousById.get(testCase.scenarioId);

    if (!previousCase) {
      delta.newTests += 1;
      if (isFailure(testCase.status)) delta.newFailures += 1;
      return delta;
    }

    if (isFailure(testCase.status) && isFailure(previousCase.status)) {
      delta.persistentFailures += 1;
    } else if (isFailure(testCase.status)) {
      delta.newFailures += 1;
    } else if (isFailure(previousCase.status)) {
      delta.recoveredTests += 1;
    }

    return delta;
  }, { newFailures: 0, recoveredTests: 0, persistentFailures: 0, newTests: 0 });
};

const regressionCases: Record<string, { previous: ComparisonCase[]; current: ComparisonCase[] }> = {
  shopsphere: {
    previous: [
      { scenarioId: 'checkout-card', status: 'FAILED' },
      { scenarioId: 'catalog-search', status: 'FAILED' },
      { scenarioId: 'account-profile', status: 'PASSED' }
    ],
    current: [
      { scenarioId: 'checkout-card', status: 'FAILED' },
      { scenarioId: 'catalog-search', status: 'PASSED' },
      { scenarioId: 'account-profile', status: 'FAILED' },
      { scenarioId: 'checkout-voucher', status: 'FAILED' },
      { scenarioId: 'catalog-filter', status: 'PASSED' }
    ]
  },
  servicedesk: {
    previous: [{ scenarioId: 'ticket-route', status: 'PASSED' }],
    current: [{ scenarioId: 'ticket-route', status: 'FAILED' }]
  },
  pocketwallet: {
    previous: [{ scenarioId: 'mobile-auth', status: 'FAILED' }],
    current: [{ scenarioId: 'mobile-auth', status: 'PASSED' }]
  }
};

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
  qualityScore: computeQualityScore(91, 5, 1, 96),
  approvalRate: computeApproval(91, 96),
  testsExecuted: 96,
  passed: 91,
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

export const productByKey = (key: string) => {
  const product = demoProducts.find((entry: (typeof demoProducts)[number]) => entry.key === key);
  const comparison = regressionCases[key];

  if (!product) return undefined;

  return {
    ...product,
    regressionDelta: comparison
      ? calculateRegressionDelta(comparison.previous, comparison.current)
      : { newFailures: 0, recoveredTests: 0, persistentFailures: 0, newTests: 0 }
  };
};

export const executionsForProduct = (key: string) => {
  const product = productByKey(key);
  if (!product) return [];

  if (key === 'pocketwallet') {
    return [
      { id: 'pocketwallet-recovery', productKey: key, date: product.lastExecutionAt, status: 'PASSED', executed: 18, passed: 18, failed: 0, infrastructureErrors: 0, approval: 100, duration: 1160000, source: 'Manual recovery' },
      { id: 'pocketwallet-infrastructure-error', productKey: key, date: '2026-08-05T23:00:00.000Z', status: 'INFRASTRUCTURE_ERROR', executed: 0, passed: 0, failed: 0, infrastructureErrors: 1, approval: null, duration: 42000, source: 'Mobile harness demo' }
    ];
  }

  if (key === 'servicedesk') {
    return [
      { id: 'servicedesk-latest', productKey: key, date: product.lastExecutionAt, status: 'STALE', executed: 32, passed: 30, failed: 2, infrastructureErrors: 0, approval: 93.8, duration: 1460000, source: 'Schedule' },
      { id: 'servicedesk-previous', productKey: key, date: '2026-07-18T15:40:00.000Z', status: 'PASSED', executed: 32, passed: 32, failed: 0, infrastructureErrors: 0, approval: 100, duration: 1390000, source: 'Schedule' }
    ];
  }

  return [
    { id: 'shopsphere-latest', productKey: key, date: product.lastExecutionAt, status: 'FAILED', executed: 46, passed: 43, failed: 3, infrastructureErrors: 0, approval: 93.5, duration: 1920000, source: 'Push main' },
    { id: 'shopsphere-previous', productKey: key, date: '2026-08-07T08:10:00.000Z', status: 'FAILED', executed: 44, passed: 42, failed: 2, infrastructureErrors: 0, approval: 95.5, duration: 2000000, source: 'Schedule' }
  ];
};
