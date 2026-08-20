import { z } from 'zod';

export const productKeySchema = z.enum(['shopsphere', 'servicedesk', 'pocketwallet']);
export const reportFormatSchema = z.enum([
  'mochawesome',
  'playwright-json-v1',
  'mobile-e2e-json-v1'
]);
export const normalizedStatusSchema = z.enum([
  'PASSED',
  'FAILED',
  'SKIPPED',
  'ERROR',
  'NOT_EXECUTED'
]);
export const suiteTypeSchema = z.enum(['SMOKE', 'REGRESSION']);
export const pipelineSourceSchema = z.enum(['DEMO_PIPELINE', 'GITHUB_ACTIONS', 'LOCAL_CLI']);
export const executionOriginSchema = z.enum(['SEEDED_DEMO', 'DEMO_PIPELINE', 'EXTERNAL_CI']);
export const demoModeSchema = z.enum(['SUCCESS', 'FUNCTIONAL_FAILURE', 'INFRASTRUCTURE_FAILURE']);
export const demoRunStateSchema = z.enum(['QUEUED', 'RUNNING', 'PROCESSING_REPORT', 'COMPLETED', 'FAILED', 'ERROR']);
export const freshnessSchema = z.enum(['FRESH', 'STALE', 'OVERDUE']);

const optionalUrlSchema = z.union([z.string().url(), z.literal(''), z.null()]).transform((value) => value || null);
const optionalIdentitySchema = z.union([z.string().min(1).max(200), z.null()]).default(null);

export const reportIngestionSchema = z.object({
  productKey: productKeySchema.optional(),
  reportFormat: reportFormatSchema,
  source: pipelineSourceSchema,
  suiteType: suiteTypeSchema,
  branch: z.string().min(1).max(200),
  commitSha: z.string().min(1).max(100),
  pipelineId: optionalIdentitySchema,
  pipelineUrl: optionalUrlSchema,
  jobId: optionalIdentitySchema,
  jobName: z.string().min(1).max(200),
  jobUrl: optionalUrlSchema,
  artifactUrl: optionalUrlSchema,
  environment: z.string().min(1).max(100),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  report: z.unknown()
}).superRefine((value, context) => {
  if (Date.parse(value.finishedAt) < Date.parse(value.startedAt)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['finishedAt'], message: 'finishedAt must not precede startedAt' });
  }
});

export const normalizedErrorSchema = z.object({
  type: z.string().nullable(),
  message: z.string().min(1),
  expected: z.string().nullable(),
  actual: z.string().nullable(),
  stack: z.string().nullable()
});

export const normalizedTestCaseSchema = z.object({
  stableKey: z.string().min(1),
  framework: z.string().min(1),
  file: z.string(),
  suitePath: z.array(z.string()),
  title: z.string().min(1),
  status: normalizedStatusSchema,
  durationMs: z.number().int().nonnegative(),
  error: normalizedErrorSchema.nullable()
});

export const normalizedSuiteSchema = z.object({
  name: z.string().min(1),
  status: normalizedStatusSchema,
  total: z.number().int().nonnegative(),
  executed: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  tests: z.array(normalizedTestCaseSchema)
});

export const executionSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  executed: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative()
});

export const normalizedExecutionSchema = z.object({
  productKey: productKeySchema,
  reportFormat: reportFormatSchema,
  source: pipelineSourceSchema,
  origin: executionOriginSchema,
  suiteType: suiteTypeSchema,
  status: normalizedStatusSchema,
  branch: z.string(),
  commitSha: z.string(),
  pipelineId: z.string().nullable(),
  pipelineUrl: z.string().nullable(),
  jobId: z.string().nullable(),
  jobName: z.string(),
  jobUrl: z.string().nullable(),
  artifactUrl: z.string().nullable(),
  environment: z.string(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  durationMs: z.number().int().nonnegative(),
  summary: executionSummarySchema,
  suites: z.array(normalizedSuiteSchema),
  infrastructureError: normalizedErrorSchema.nullable()
});

export const demoRunRequestSchema = z.object({
  product: productKeySchema,
  suite: suiteTypeSchema,
  mode: demoModeSchema
}).strict();

export const mobileReportSchema = z.object({
  version: z.literal('mobile-e2e-json-v1'),
  executionMode: z.literal('MOBILE_HARNESS_DEMO'),
  total: z.number().int().nonnegative(),
  executed: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  infrastructureError: z.object({ message: z.string(), stack: z.string().optional() }).nullable(),
  tests: z.array(z.object({
    file: z.string(),
    suite: z.string(),
    title: z.string(),
    status: normalizedStatusSchema,
    durationMs: z.number().int().nonnegative(),
    error: z.object({
      message: z.string(),
      expected: z.string().optional(),
      actual: z.string().optional(),
      stack: z.string().optional()
    }).nullable().optional()
  }))
});

export const playwrightReportSchema = z.object({
  version: z.literal('playwright-json-v1'),
  framework: z.literal('Playwright'),
  infrastructureError: z.object({ message: z.string(), stack: z.string().optional() }).nullable(),
  tests: z.array(z.object({
    file: z.string(),
    suitePath: z.array(z.string()),
    title: z.string(),
    status: z.enum(['passed', 'failed', 'skipped', 'timedOut', 'interrupted']),
    durationMs: z.number().int().nonnegative(),
    error: z.object({
      message: z.string(),
      expected: z.string().optional(),
      actual: z.string().optional(),
      stack: z.string().optional()
    }).nullable().optional()
  }))
});

export type ProductKey = z.infer<typeof productKeySchema>;
export type ReportFormat = z.infer<typeof reportFormatSchema>;
export type NormalizedStatus = z.infer<typeof normalizedStatusSchema>;
export type SuiteType = z.infer<typeof suiteTypeSchema>;
export type PipelineSource = z.infer<typeof pipelineSourceSchema>;
export type ExecutionOrigin = z.infer<typeof executionOriginSchema>;
export type DemoMode = z.infer<typeof demoModeSchema>;
export type DemoRunState = z.infer<typeof demoRunStateSchema>;
export type ReportIngestion = z.infer<typeof reportIngestionSchema>;
export type NormalizedError = z.infer<typeof normalizedErrorSchema>;
export type NormalizedTestCase = z.infer<typeof normalizedTestCaseSchema>;
export type NormalizedSuite = z.infer<typeof normalizedSuiteSchema>;
export type ExecutionSummary = z.infer<typeof executionSummarySchema>;
export type NormalizedExecution = z.infer<typeof normalizedExecutionSchema>;
export type MobileReport = z.infer<typeof mobileReportSchema>;
export type PlaywrightReport = z.infer<typeof playwrightReportSchema>;
