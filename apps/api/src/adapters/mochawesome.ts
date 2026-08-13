import { z } from 'zod';
import type { NormalizedTestCase } from '@qualityops-hub/shared';
import { buildExecution, infrastructureSuite, makeTest, normalizedError } from './helpers.js';
import type { AdapterContext, ReportAdapter } from './types.js';

const mochaTestSchema = z.object({
  title: z.string(),
  fullTitle: z.string().optional(),
  duration: z.number().nonnegative().optional(),
  state: z.string().optional(),
  pass: z.boolean().optional(),
  fail: z.boolean().optional(),
  pending: z.boolean().optional(),
  skipped: z.boolean().optional(),
  err: z.record(z.unknown()).optional()
}).passthrough();

const mochaSuiteSchema: z.ZodType<MochaSuite> = z.lazy(() => z.object({
  title: z.string().optional(),
  fullFile: z.string().optional(),
  file: z.string().optional(),
  tests: z.array(mochaTestSchema).optional(),
  suites: z.array(mochaSuiteSchema).optional()
}).passthrough());

type MochaSuite = {
  title?: string;
  fullFile?: string;
  file?: string;
  tests?: Array<z.infer<typeof mochaTestSchema>>;
  suites?: MochaSuite[];
};

const reportSchema = z.object({
  results: z.array(mochaSuiteSchema).optional(),
  infrastructureError: z.object({ message: z.string(), stack: z.string().optional() }).nullable().optional(),
  knownTotal: z.number().int().nonnegative().optional()
}).passthrough();

function collect(suite: MochaSuite, parents: string[], inheritedFile = ''): NormalizedTestCase[] {
  const title = suite.title?.trim();
  const suitePath = title ? [...parents, title] : parents;
  const file = suite.file || suite.fullFile || inheritedFile;
  const current = (suite.tests ?? []).map((test) => {
    const status = test.pass || test.state === 'passed'
      ? 'PASSED'
      : test.pending || test.skipped || test.state === 'pending'
        ? 'SKIPPED'
        : 'FAILED';
    return makeTest({
      framework: 'Cypress',
      file,
      suitePath,
      title: test.title,
      status,
      durationMs: Math.round(test.duration ?? 0),
      error: status === 'FAILED' ? normalizedError(test.err ?? { message: 'Cypress assertion failed' }) : null
    });
  });
  return [...current, ...(suite.suites ?? []).flatMap((child) => collect(child, suitePath, file))];
}

export const mochawesomeAdapter: ReportAdapter = {
  format: 'mochawesome',
  canHandle(format, report) {
    return format === this.format && typeof report === 'object' && report !== null;
  },
  validate(report) {
    reportSchema.parse(report);
  },
  normalize(context: AdapterContext) {
    const report = reportSchema.parse(context.report);
    const infrastructureError = normalizedError(report.infrastructureError ?? null);
    if (infrastructureError) {
      const knownTotal = report.knownTotal ?? 0;
      return buildExecution(context, [infrastructureSuite('ShopSphere demo suite', knownTotal)], infrastructureError, knownTotal);
    }
    const tests = (report.results ?? []).flatMap((result) => collect(result, []));
    const bySuite = new Map<string, NormalizedTestCase[]>();
    for (const test of tests) {
      const name = test.suitePath[0] ?? 'ShopSphere demo suite';
      bySuite.set(name, [...(bySuite.get(name) ?? []), test]);
    }
    const suites = [...bySuite.entries()].map(([name, items]) => ({
      name,
      tests: items
    })).map(({ name, tests: items }) => {
      const passed = items.filter((test) => test.status === 'PASSED').length;
      const failed = items.filter((test) => test.status === 'FAILED').length;
      const skipped = items.filter((test) => test.status === 'SKIPPED').length;
      return { name, status: failed ? 'FAILED' as const : passed ? 'PASSED' as const : 'SKIPPED' as const, total: items.length, executed: passed + failed, passed, failed, skipped, errors: 0, tests: items };
    });
    return buildExecution(context, suites, null);
  }
};
