export type DemoProduct = {
  key: string;
  name: string;
  framework: string;
  reportFormat: string;
  status: 'ACTIVE' | 'STALE' | 'ERROR' | 'NO_EXECUTION';
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
  suites: Array<{ name: string; status: string; total: number; passed: number; failed: number; skipped: number; }>; 
};

export const demoProducts: DemoProduct[] = [
  {
    key: 'shopsphere',
    name: 'ShopSphere',
    framework: 'Cypress',
    reportFormat: 'Mochawesome',
    status: 'ACTIVE',
    total: 46,
    executed: 46,
    passed: 43,
    failed: 3,
    skipped: 0,
    infrastructureErrors: 0,
    approvalRate: 93.5,
    freshness: 'FRESH',
    lastExecutionAt: '2026-08-12T06:15:00.000Z',
    branch: 'release/august',
    pipeline: 'shopsphere-regression-318',
    commit: 'a8e7d13',
    statusLabel: 'Demo active production-like run',
    syntheticData: true,
    suites: [
      { name: 'Checkout', status: 'PASSED', total: 18, passed: 17, failed: 1, skipped: 0 },
      { name: 'Catalog', status: 'PASSED', total: 16, passed: 15, failed: 1, skipped: 0 },
      { name: 'Account', status: 'PASSED', total: 12, passed: 11, failed: 1, skipped: 0 }
    ]
  },
  {
    key: 'servicedesk',
    name: 'ServiceDesk',
    framework: 'Playwright',
    reportFormat: 'Playwright JSON/JUnit',
    status: 'STALE',
    total: 32,
    executed: 32,
    passed: 30,
    failed: 2,
    skipped: 0,
    infrastructureErrors: 0,
    approvalRate: 93.8,
    freshness: 'STALE',
    lastExecutionAt: '2026-07-21T15:40:00.000Z',
    branch: 'main',
    pipeline: 'servicedesk-e2e-154',
    commit: 'cd9e174',
    statusLabel: 'Stale execution older than policy target',
    syntheticData: true,
    suites: [
      { name: 'Portal UI', status: 'PASSED', total: 16, passed: 15, failed: 1, skipped: 0 },
      { name: 'Routing', status: 'PASSED', total: 10, passed: 9, failed: 1, skipped: 0 },
      { name: 'Security', status: 'PASSED', total: 6, passed: 6, failed: 0, skipped: 0 }
    ]
  },
  {
    key: 'pocketwallet',
    name: 'PocketWallet',
    framework: 'Mobile Harness Demo',
    reportFormat: 'Synthetic mobile JSON',
    status: 'ACTIVE',
    total: 18,
    executed: 18,
    passed: 18,
    failed: 0,
    skipped: 0,
    infrastructureErrors: 0,
    approvalRate: 100,
    freshness: 'FRESH',
    lastExecutionAt: '2026-08-12T07:20:00.000Z',
    branch: 'release/mobile',
    pipeline: 'pocketwallet-mobile-42',
    commit: 'f2d01cf',
    statusLabel: 'MOBILE HARNESS DEMO recovery after a synthetic infrastructure error',
    syntheticData: true,
    suites: [
      { name: 'Auth', status: 'PASSED', total: 8, passed: 8, failed: 0, skipped: 0 },
      { name: 'Transfers', status: 'PASSED', total: 6, passed: 6, failed: 0, skipped: 0 },
      { name: 'Alerts', status: 'PASSED', total: 4, passed: 4, failed: 0, skipped: 0 }
    ]
  }
];
