import { z } from 'zod';

export const normalizedStatusSchema = z.enum([
  'PASSED',
  'FAILED',
  'SKIPPED',
  'ERROR',
  'NOT_EXECUTED'
]);

export const productKeySchema = z.enum(['shopsphere', 'servicedesk', 'pocketwallet']);
export const productStatusSchema = z.enum([
  'ACTIVE',
  'STALE',
  'CONFIGURATION_PENDING',
  'ERROR',
  'NO_EXECUTION'
]);

export const pipelineProviderSchema = z.enum(['github-actions']);
export const suiteTypeSchema = z.enum(['Regression', 'Smoke', 'E2E', 'Mobile', 'API']);

export const pipelineMetadataSchema = z.object({
  provider: pipelineProviderSchema,
  repository: z.string(),
  branch: z.string(),
  commitSha: z.string(),
  pipelineId: z.string(),
  pipelineUrl: z.string().url(),
  jobId: z.string(),
  jobName: z.string(),
  jobUrl: z.string().url(),
  artifactUrl: z.string().url(),
  environment: z.string(),
  source: z.enum(['pull_request', 'push', 'schedule', 'release', 'manual']),
  suiteType: suiteTypeSchema,
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime()
});

export const executionSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  executed: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  infrastructureErrors: z.number().int().nonnegative(),
  durationMs: z.number().nonnegative(),
  approvalRate: z.number().min(0).max(100),
  qualityScore: z.number().min(0).max(100)
});

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  productKey: productKeySchema,
  framework: z.string(),
  reportFormat: z.string(),
  status: productStatusSchema,
  lastExecutionAt: z.string().datetime(),
  branch: z.string(),
  pipeline: z.string(),
  freshness: z.enum(['FRESH', 'STALE', 'OVERDUE']),
  summary: executionSummarySchema,
  latestRegression: z.string().nullable(),
  automationCoverage: z.number().min(0).max(100).nullable(),
  executionPolicy: z.object({
    source: z.enum(['Pull Request', 'Push main', 'Schedule', 'Release', 'Manual']),
    suiteType: suiteTypeSchema,
    official: z.boolean(),
    freshnessTargetHours: z.number().int().nonnegative()
  })
});

export type NormalizedStatus = z.infer<typeof normalizedStatusSchema>;
export type ProductKey = z.infer<typeof productKeySchema>;
export type ProductStatus = z.infer<typeof productStatusSchema>;
export type PipelineMetadata = z.infer<typeof pipelineMetadataSchema>;
export type ExecutionSummary = z.infer<typeof executionSummarySchema>;
export type Product = z.infer<typeof productSchema>;
