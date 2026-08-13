import { mobileReportSchema } from '@qualityops-hub/shared';
import { buildExecution, infrastructureSuite, makeTest, normalizedError, summarizeSuite } from './helpers.js';
import type { AdapterContext, ReportAdapter } from './types.js';

export const mobileAdapter: ReportAdapter = {
  format: 'mobile-e2e-json-v1',
  canHandle(format, report) {
    return format === this.format && typeof report === 'object' && report !== null;
  },
  validate(report) {
    mobileReportSchema.parse(report);
  },
  normalize(context: AdapterContext) {
    const report = mobileReportSchema.parse(context.report);
    const infrastructureError = normalizedError(report.infrastructureError);
    if (infrastructureError) {
      return buildExecution(context, [infrastructureSuite('PocketWallet mobile harness', report.total)], infrastructureError, report.total);
    }
    const tests = report.tests.map((test) => makeTest({
      framework: 'MOBILE_HARNESS_DEMO',
      file: test.file,
      suitePath: [test.suite],
      title: test.title,
      status: test.status,
      durationMs: test.durationMs,
      error: test.status === 'FAILED' ? normalizedError(test.error ?? { message: 'Mobile harness assertion failed' }) : null
    }));
    return buildExecution(context, [summarizeSuite('PocketWallet mobile harness', tests)], null);
  }
};
