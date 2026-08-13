import type { ProductKey, ReportIngestion, ReportFormat } from '@qualityops-hub/shared';
import { adapterRegistry, type AdapterRegistry } from './adapters/registry.js';
import { executionKeys, reportContentHash } from './security.js';
import type { QualityRepository } from './repository.js';

const productFormats: Record<ProductKey, ReportFormat> = {
  shopsphere: 'mochawesome',
  servicedesk: 'playwright-json-v1',
  pocketwallet: 'mobile-e2e-json-v1'
};

export class ReportIngestionService {
  constructor(
    private readonly repository: QualityRepository,
    private readonly registry: AdapterRegistry = adapterRegistry
  ) {}

  async ingest(productKey: ProductKey, body: ReportIngestion, artifactPath?: string | null) {
    if (productFormats[productKey] !== body.reportFormat) {
      throw new Error(`${body.reportFormat} is not accepted for ${productKey}`);
    }
    const adapter = this.registry.resolve(body.reportFormat, body.report);
    const normalized = adapter.normalize({ ...body, productKey, artifactPath });
    const contentHash = reportContentHash(body.report);
    const keys = executionKeys({
      productKey,
      pipelineId: body.pipelineId,
      jobId: body.jobId,
      reportFormat: body.reportFormat,
      contentHash
    });
    const persisted = await this.repository.persistExecution(normalized, { ...keys, contentHash, artifactPath });
    return { ...persisted, normalized, contentHash };
  }
}
