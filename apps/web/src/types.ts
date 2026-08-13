export type ProductStatus = 'ACTIVE' | 'STALE' | 'ERROR' | 'NO_EXECUTION';

export type ProductSummary = {
  key: string;
  name: string;
  description: string;
  framework: string;
  reportFormat: string;
  status: ProductStatus;
  executionStatus: 'PASSED' | 'FAILED' | 'ERROR' | 'SKIPPED' | 'NOT_EXECUTED';
  total: number;
  executed: number;
  passed: number;
  failed: number;
  skipped: number;
  infrastructureErrors: number;
  approvalRate: number | null;
  qualityScore: number | null;
  freshness: 'FRESH' | 'STALE' | 'OVERDUE';
  lastExecutionAt: string | null;
  branch: string;
  pipeline: string;
  commit: string;
  statusLabel: string;
  origin: 'SEEDED_DEMO' | 'DEMO_PIPELINE' | null;
  syntheticData: true;
};

export type DashboardResponse = {
  qualityScore: number | null;
  approvalRate: number | null;
  testsExecuted: number;
  passed: number;
  failed: number;
  infrastructureErrors: number;
  products: number;
  productsWithRecentExecution: number;
  productsStale: number;
  automationCoverage: number | null;
  latestRegression: string | null;
  productsSummary: ProductSummary[];
};

export type Execution = {
  id: string;
  productKey: string;
  productName?: string;
  date: string;
  status: string;
  total: number;
  executed: number;
  passed: number;
  failed: number;
  skipped: number;
  infrastructureErrors: number;
  approval: number | null;
  qualityScore: number | null;
  duration: number;
  source: string;
  origin: 'SEEDED_DEMO' | 'DEMO_PIPELINE';
  reportFormat: string;
  suiteType: string;
};

export type RegressionDelta = {
  newFailures: number;
  recovered: number;
  persistentFailures: number;
  newTests: number;
  removedTests: number;
};

export type DemoRun = {
  runId: string;
  product: string;
  suite: string;
  mode: string;
  state: 'QUEUED' | 'RUNNING' | 'PROCESSING_REPORT' | 'COMPLETED' | 'FAILED';
  progressMessage: string;
  executionId: string | null;
  error: string | null;
};
