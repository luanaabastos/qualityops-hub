import { createHash } from 'node:crypto';
import type { ProductKey, ReportFormat } from '@qualityops-hub/shared';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)])
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function reportContentHash(report: unknown): string {
  return sha256(canonicalJson(report));
}

export function executionKeys(input: {
  productKey: ProductKey;
  pipelineId: string | null;
  jobId: string | null;
  reportFormat: ReportFormat;
  contentHash: string;
}): { baseKey: string; identityKey: string } {
  const base = canonicalJson({
    productKey: input.productKey,
    pipelineId: input.pipelineId ?? '<NULL>',
    jobId: input.jobId ?? '<NULL>',
    reportFormat: input.reportFormat
  });
  const baseKey = sha256(base);
  return { baseKey, identityKey: sha256(`${baseKey}:${input.contentHash}`) };
}
