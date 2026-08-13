import type { NormalizedExecution, ReportFormat, ReportIngestion, ProductKey } from '@qualityops-hub/shared';

export type AdapterContext = ReportIngestion & { productKey: ProductKey; artifactPath?: string | null };

export interface ReportAdapter {
  readonly format: ReportFormat;
  canHandle(format: string, report: unknown): boolean;
  validate(report: unknown): void;
  normalize(context: AdapterContext): NormalizedExecution;
}
