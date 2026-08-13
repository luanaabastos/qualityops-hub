export type ProductStatus = 'ACTIVE' | 'STALE' | 'ERROR' | 'NO_EXECUTION';

export type ProductSummary = {
  key: string;
  name: string;
  framework: string;
  reportFormat: string;
  status: ProductStatus;
  total: number;
  executed: number;
  passed: number;
  failed: number;
  skipped: number;
  infrastructureErrors: number;
  approvalRate: number | null;
  freshness: 'FRESH' | 'STALE' | 'OVERDUE';
  lastExecutionAt: string;
  branch: string;
  pipeline: string;
  commit: string;
  statusLabel: string;
  syntheticData: true;
};

export type DashboardResponse = {
  qualityScore: number;
  approvalRate: number;
  testsExecuted: number;
  passed: number;
  failed: number;
  infrastructureErrors: number;
  products: number;
  productsWithRecentExecution: number;
  productsStale: number;
  automationCoverage: number | null;
  latestRegression: string;
  productsSummary: ProductSummary[];
};

export type Execution = {
  id: string;
  productKey: string;
  date: string;
  status: string;
  executed: number;
  passed: number;
  failed: number;
  infrastructureErrors: number;
  approval: number | null;
  duration: number;
  source: string;
};

export type RegressionDelta = {
  newFailures: number;
  recoveredTests: number;
  persistentFailures: number;
  newTests: number;
};
