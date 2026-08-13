import {
  createStableTestKey,
  normalizedExecutionSchema,
  type NormalizedError,
  type NormalizedExecution,
  type NormalizedStatus,
  type NormalizedSuite,
  type NormalizedTestCase
} from '@qualityops-hub/shared';
import type { AdapterContext } from './types.js';

export function sanitizeDiagnostic(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  return value
    .replaceAll(/C:\\Users\\[^\\\s]+\\/gi, '<workspace>\\')
    .replaceAll(/\/Users\/[^/\s]+\//g, '<workspace>/')
    .replaceAll(/\/home\/[^/\s]+\//g, '<workspace>/')
    .replaceAll(/file:\/\/[A-Za-z]:\/[^\s)]+/gi, '<workspace>/file')
    .slice(0, 8_000);
}

export function normalizedError(error: unknown): NormalizedError | null {
  if (!error || typeof error !== 'object') return null;
  const item = error as Record<string, unknown>;
  const message = sanitizeDiagnostic(item.message) ?? sanitizeDiagnostic(item.error) ?? 'Unknown test error';
  const diff = typeof item.diff === 'string' ? item.diff : '';
  const actualFromDiff = /^-\s*(.+)$/m.exec(diff)?.[1] ?? null;
  const expectedFromDiff = /^\+\s*(.+)$/m.exec(diff)?.[1] ?? null;
  return {
    type: typeof item.name === 'string' ? item.name : typeof item.type === 'string' ? item.type : null,
    message,
    expected: item.expected === undefined ? sanitizeDiagnostic(expectedFromDiff) : sanitizeDiagnostic(String(item.expected)),
    actual: item.actual === undefined ? sanitizeDiagnostic(actualFromDiff) : sanitizeDiagnostic(String(item.actual)),
    stack: sanitizeDiagnostic(item.stack ?? item.estack)
  };
}

export function makeTest(input: Omit<NormalizedTestCase, 'stableKey'>): NormalizedTestCase {
  const sanitizedInput = { ...input, file: sanitizeDiagnostic(input.file) ?? '' };
  return {
    ...sanitizedInput,
    stableKey: createStableTestKey(sanitizedInput)
  };
}

export function summarizeSuite(name: string, tests: NormalizedTestCase[]): NormalizedSuite {
  const passed = tests.filter((test) => test.status === 'PASSED').length;
  const failed = tests.filter((test) => test.status === 'FAILED').length;
  const skipped = tests.filter((test) => test.status === 'SKIPPED' || test.status === 'NOT_EXECUTED').length;
  const errors = tests.filter((test) => test.status === 'ERROR').length;
  const executed = passed + failed;
  const status: NormalizedStatus = errors > 0 ? 'ERROR' : failed > 0 ? 'FAILED' : executed > 0 ? 'PASSED' : skipped > 0 ? 'SKIPPED' : 'NOT_EXECUTED';
  return { name, status, total: tests.length, executed, passed, failed, skipped, errors, tests };
}

export function buildExecution(
  context: AdapterContext,
  suites: NormalizedSuite[],
  infrastructureError: NormalizedError | null,
  knownTotal?: number
): NormalizedExecution {
  const totals = suites.reduce((summary, suite) => ({
    total: summary.total + suite.total,
    executed: summary.executed + suite.executed,
    passed: summary.passed + suite.passed,
    failed: summary.failed + suite.failed,
    skipped: summary.skipped + suite.skipped,
    errors: summary.errors + suite.errors
  }), { total: 0, executed: 0, passed: 0, failed: 0, skipped: 0, errors: 0 });

  if (infrastructureError) {
    totals.total = Math.max(knownTotal ?? 0, totals.total);
    totals.executed = 0;
    totals.passed = 0;
    totals.failed = 0;
    totals.skipped = 0;
    totals.errors = Math.max(1, totals.errors);
  }

  const durationMs = Math.max(0, Date.parse(context.finishedAt) - Date.parse(context.startedAt));
  const status: NormalizedStatus = infrastructureError || totals.errors > 0
    ? 'ERROR'
    : totals.failed > 0
      ? 'FAILED'
      : totals.executed > 0
        ? 'PASSED'
        : totals.skipped > 0
          ? 'SKIPPED'
          : 'NOT_EXECUTED';

  return normalizedExecutionSchema.parse({
    productKey: context.productKey,
    reportFormat: context.reportFormat,
    source: context.source,
    origin: 'DEMO_PIPELINE',
    suiteType: context.suiteType,
    status,
    branch: context.branch,
    commitSha: context.commitSha,
    pipelineId: context.pipelineId,
    pipelineUrl: context.pipelineUrl,
    jobId: context.jobId,
    jobName: context.jobName,
    jobUrl: context.jobUrl,
    artifactUrl: context.artifactUrl,
    environment: context.environment,
    startedAt: context.startedAt,
    finishedAt: context.finishedAt,
    durationMs,
    summary: totals,
    suites,
    infrastructureError
  });
}

export function infrastructureSuite(name: string, total: number): NormalizedSuite {
  return { name, status: 'NOT_EXECUTED', total, executed: 0, passed: 0, failed: 0, skipped: 0, errors: 0, tests: [] };
}
