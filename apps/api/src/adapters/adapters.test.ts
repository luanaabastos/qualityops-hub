import { describe, expect, it } from 'vitest';
import { adapterRegistry } from './registry.js';
import { sanitizeDiagnostic } from './helpers.js';

const base = {
  source: 'DEMO_PIPELINE' as const,
  suiteType: 'REGRESSION' as const,
  branch: 'main',
  commitSha: 'abc123',
  pipelineId: 'pipeline',
  pipelineUrl: null,
  jobId: 'job',
  jobName: 'Demo',
  jobUrl: null,
  artifactUrl: null,
  environment: 'local',
  startedAt: '2026-08-12T10:00:00.000Z',
  finishedAt: '2026-08-12T10:00:01.000Z'
};

describe('adapter registry and normalized semantics', () => {
  it('extracts nested Mochawesome tests instead of trusting root totals', () => {
    const report = { stats: { tests: 999 }, results: [{ title: 'Catalog', file: 'catalog.cy.ts', suites: [{ title: 'Search', tests: [{ title: 'finds item', state: 'passed', pass: true, duration: 23 }] }] }] };
    const adapter = adapterRegistry.resolve('mochawesome', report);
    const result = adapter.normalize({ ...base, productKey: 'shopsphere', reportFormat: 'mochawesome', report });
    expect(result.summary).toMatchObject({ total: 1, executed: 1, passed: 1, failed: 0, errors: 0 });
    expect(result.suites[0].tests[0]).toMatchObject({ title: 'finds item', suitePath: ['Catalog', 'Search'] });
  });

  it('extracts available assertion values from a Mochawesome diff', () => {
    const report = { results: [{ title: 'Cart', file: 'cart.cy.ts', tests: [{ title: 'count', state: 'failed', fail: true, duration: 10, err: { message: 'count mismatch', diff: "- '1'\n+ '2'" } }] }] };
    const result = adapterRegistry.resolve('mochawesome', report).normalize({ ...base, productKey: 'shopsphere', reportFormat: 'mochawesome', report });
    expect(result.suites[0].tests[0].error).toMatchObject({ actual: "'1'", expected: "'2'" });
  });

  it('normalizes the versioned Playwright contract', () => {
    const report = { version: 'playwright-json-v1', framework: 'Playwright', infrastructureError: null, tests: [{ file: 'ticket.spec.ts', suitePath: ['Tickets'], title: 'opens ticket', status: 'failed', durationMs: 20, error: { message: 'expected open', expected: 'open', actual: 'closed' } }] };
    const result = adapterRegistry.resolve('playwright-json-v1', report).normalize({ ...base, productKey: 'servicedesk', reportFormat: 'playwright-json-v1', report });
    expect(result.status).toBe('FAILED');
    expect(result.summary).toMatchObject({ executed: 1, failed: 1, errors: 0 });
  });

  it('labels authenticated GitHub Actions ingestion as external CI', () => {
    const report = { version: 'playwright-json-v1', framework: 'Playwright', infrastructureError: null, tests: [] };
    const result = adapterRegistry.resolve('playwright-json-v1', report).normalize({
      ...base,
      source: 'GITHUB_ACTIONS',
      productKey: 'servicedesk',
      reportFormat: 'playwright-json-v1',
      report
    });
    expect(result.origin).toBe('EXTERNAL_CI');
  });

  it('keeps mobile infrastructure errors separate from functional failures', () => {
    const report = { version: 'mobile-e2e-json-v1', executionMode: 'MOBILE_HARNESS_DEMO', total: 5, executed: 0, passed: 0, failed: 0, skipped: 0, infrastructureError: { message: 'harness unavailable' }, tests: [] };
    const result = adapterRegistry.resolve('mobile-e2e-json-v1', report).normalize({ ...base, productKey: 'pocketwallet', reportFormat: 'mobile-e2e-json-v1', report });
    expect(result.status).toBe('ERROR');
    expect(result.summary).toEqual({ total: 5, executed: 0, passed: 0, failed: 0, skipped: 0, errors: 1 });
  });

  it('sanitizes personal absolute paths', () => {
    expect(sanitizeDiagnostic('at C:\\Users\\person\\project\\file.ts:1')).toBe('at <workspace>\\project\\file.ts:1');
    const macPath = `at ${['', 'Users', 'person', 'project', 'file.ts:1'].join('/')}`;
    const linuxPath = `at ${['', 'home', 'person', 'project', 'file.ts:1'].join('/')}`;
    expect(sanitizeDiagnostic(macPath)).toBe('at <workspace>/project/file.ts:1');
    expect(sanitizeDiagnostic(linuxPath)).toBe('at <workspace>/project/file.ts:1');
  });
});
