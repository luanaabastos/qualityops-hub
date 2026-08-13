import { createStableTestKey, type NormalizedExecution, type ProductKey, type NormalizedStatus } from '@qualityops-hub/shared';
import type { Database } from './database.js';
import type { QualityRepository } from './repository.js';
import { executionKeys, reportContentHash } from './security.js';

const scenarios: Record<ProductKey, { framework: string; file: string; suite: string; titles: string[] }> = {
  shopsphere: { framework: 'Cypress', file: 'demo-runners/shopsphere/shopsphere.cy.ts', suite: 'ShopSphere', titles: ['fictional login', 'catalog search', 'add item to cart', 'fictional checkout', 'error validation'] },
  servicedesk: { framework: 'Playwright', file: 'demo-runners/servicedesk/servicedesk.spec.ts', suite: 'ServiceDesk', titles: ['open ticket', 'edit ticket', 'change priority', 'resolve ticket', 'filter tickets'] },
  pocketwallet: { framework: 'MOBILE_HARNESS_DEMO', file: 'demo-runners/pocketwallet/harness.mjs', suite: 'PocketWallet mobile harness', titles: ['login', 'balance', 'transfer', 'receipt', 'logout'] }
};

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

function seedExecution(productKey: ProductKey, sequence: number, status: 'PASSED' | 'FAILED' | 'ERROR', ageHours: number): NormalizedExecution {
  const definition = scenarios[productKey];
  const startedAt = hoursAgo(ageHours + 0.02);
  const finishedAt = hoursAgo(ageHours);
  const infrastructure = status === 'ERROR';
  const tests = infrastructure ? [] : definition.titles.map((title, index) => {
    const testStatus: NormalizedStatus = status === 'FAILED' && index === 2 ? 'FAILED' : 'PASSED';
    const base = { framework: definition.framework, file: definition.file, suitePath: [definition.suite], title };
    return {
      ...base,
      stableKey: createStableTestKey(base),
      status: testStatus,
      durationMs: 110 + index * 15,
      error: testStatus === 'FAILED' ? { type: 'AssertionError', message: 'Expected fictional state to match', expected: 'ready', actual: 'pending', stack: '<workspace>/demo-runner:1:1' } : null
    };
  });
  const passed = tests.filter((test) => test.status === 'PASSED').length;
  const failed = tests.filter((test) => test.status === 'FAILED').length;
  return {
    productKey,
    reportFormat: productKey === 'shopsphere' ? 'mochawesome' : productKey === 'servicedesk' ? 'playwright-json-v1' : 'mobile-e2e-json-v1',
    source: 'DEMO_PIPELINE',
    origin: 'SEEDED_DEMO',
    suiteType: 'REGRESSION',
    status,
    branch: 'main',
    commitSha: `seed${sequence}${productKey.slice(0, 3)}`,
    pipelineId: `seed-${productKey}-${sequence}`,
    pipelineUrl: null,
    jobId: `seed-job-${sequence}`,
    jobName: 'Seeded demo history',
    jobUrl: null,
    artifactUrl: null,
    environment: 'seeded-demo',
    startedAt,
    finishedAt,
    durationMs: Math.max(0, Date.parse(finishedAt) - Date.parse(startedAt)),
    summary: infrastructure
      ? { total: 5, executed: 0, passed: 0, failed: 0, skipped: 0, errors: 1 }
      : { total: tests.length, executed: tests.length, passed, failed, skipped: 0, errors: 0 },
    suites: [{
      name: definition.suite,
      status: infrastructure ? 'NOT_EXECUTED' : status,
      total: infrastructure ? 5 : tests.length,
      executed: infrastructure ? 0 : tests.length,
      passed,
      failed,
      skipped: 0,
      errors: 0,
      tests
    }],
    infrastructureError: infrastructure ? { type: 'DemoInfrastructureError', message: 'Seeded infrastructure interruption; tests did not execute', expected: null, actual: null, stack: null } : null
  };
}

export async function seedDemoHistory(database: Database, repository: QualityRepository): Promise<void> {
  const products: Array<{ key: ProductKey; runs: Array<[NormalizedExecution['status'], number]> }> = [
    { key: 'shopsphere', runs: [['FAILED', 30], ['PASSED', 2]] },
    { key: 'servicedesk', runs: [['PASSED', 80], ['FAILED', 40]] },
    { key: 'pocketwallet', runs: [['ERROR', 28], ['PASSED', 1]] }
  ];
  for (const product of products) {
    const count = await database.pool.query<{ count: string }>(
      `SELECT COUNT(*) count FROM test_executions e JOIN products p ON p.id=e.product_id WHERE p.product_key=$1`, [product.key]
    );
    if (Number(count.rows[0]?.count) > 0) continue;
    for (const [index, [status, age]] of product.runs.entries()) {
      const execution = seedExecution(product.key, index + 1, status as 'PASSED' | 'FAILED' | 'ERROR', age);
      const contentHash = reportContentHash(execution);
      const keys = executionKeys({ productKey: product.key, pipelineId: execution.pipelineId, jobId: execution.jobId, reportFormat: execution.reportFormat, contentHash });
      await repository.persistExecution(execution, { ...keys, contentHash });
    }
  }
}
