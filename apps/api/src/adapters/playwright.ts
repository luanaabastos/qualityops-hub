import { playwrightReportSchema } from '@qualityops-hub/shared';
import { buildExecution, infrastructureSuite, makeTest, normalizedError, summarizeSuite } from './helpers.js';
import type { AdapterContext, ReportAdapter } from './types.js';

export const playwrightAdapter: ReportAdapter = {
  format: 'playwright-json-v1',
  canHandle(format, report) {
    return format === this.format && typeof report === 'object' && report !== null;
  },
  validate(report) {
    playwrightReportSchema.parse(report);
  },
  normalize(context: AdapterContext) {
    const report = playwrightReportSchema.parse(context.report);
    const infrastructureError = normalizedError(report.infrastructureError);
    if (infrastructureError) {
      return buildExecution(context, [infrastructureSuite('ServiceDesk demo suite', 5)], infrastructureError, 5);
    }
    const tests = report.tests.map((test) => makeTest({
      framework: 'Playwright',
      file: test.file,
      suitePath: test.suitePath,
      title: test.title,
      status: test.status === 'passed' ? 'PASSED' : test.status === 'skipped' ? 'SKIPPED' : 'FAILED',
      durationMs: test.durationMs,
      error: test.status === 'failed' || test.status === 'timedOut' || test.status === 'interrupted'
        ? normalizedError(test.error ?? { message: `Playwright test ${test.status}` })
        : null
    }));
    const grouped = new Map<string, typeof tests>();
    for (const test of tests) {
      const name = test.suitePath[0] ?? 'ServiceDesk demo suite';
      grouped.set(name, [...(grouped.get(name) ?? []), test]);
    }
    return buildExecution(context, [...grouped.entries()].map(([name, cases]) => summarizeSuite(name, cases)), null);
  }
};
