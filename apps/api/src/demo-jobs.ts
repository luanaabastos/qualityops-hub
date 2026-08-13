import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { productKeySchema, type DemoMode, type ProductKey, type SuiteType } from '@qualityops-hub/shared';
import { repositoryRoot } from './database.js';
import type { QualityRepository } from './repository.js';
import type { IntegrationTokenService } from './token-service.js';
import { sanitizeDiagnostic } from './adapters/helpers.js';

const runnerFiles: Record<ProductKey, string> = {
  shopsphere: path.join(repositoryRoot, 'demo-runners', 'shopsphere', 'run.mjs'),
  servicedesk: path.join(repositoryRoot, 'demo-runners', 'servicedesk', 'run.mjs'),
  pocketwallet: path.join(repositoryRoot, 'demo-runners', 'pocketwallet', 'harness.mjs')
};

const reportFormats: Record<ProductKey, string> = {
  shopsphere: 'mochawesome',
  servicedesk: 'playwright-json-v1',
  pocketwallet: 'mobile-e2e-json-v1'
};

function displayName(product: ProductKey): string {
  return product === 'shopsphere' ? 'ShopSphere' : product === 'servicedesk' ? 'ServiceDesk' : 'PocketWallet';
}

export class DemoJobService {
  private readonly runtimeTokens = new Map<ProductKey, string>();
  private readonly artifactsRoot = path.join(repositoryRoot, 'artifacts', 'demo-runs');

  constructor(
    private readonly repository: QualityRepository,
    private readonly tokens: IntegrationTokenService,
    private readonly apiBaseUrl: string
  ) {}

  async initialize(): Promise<void> {
    for (const product of productKeySchema.options) {
      const created = await this.tokens.rotate(product);
      this.runtimeTokens.set(product, created.token);
    }
  }

  async enqueue(input: { product: ProductKey; suite: SuiteType; mode: DemoMode }): Promise<Record<string, unknown>> {
    const runId = randomUUID();
    const artifactDirectory = path.resolve(this.artifactsRoot, runId);
    if (!artifactDirectory.startsWith(`${path.resolve(this.artifactsRoot)}${path.sep}`)) {
      throw new Error('Unsafe artifact directory');
    }
    await fs.mkdir(artifactDirectory, { recursive: true });
    const publicArtifactPath = path.posix.join('artifacts', 'demo-runs', runId);
    await this.repository.createDemoRun({ id: runId, ...input, artifactPath: publicArtifactPath });
    setImmediate(() => void this.execute(runId, input, artifactDirectory));
    return (await this.repository.getDemoRun(runId))!;
  }

  private async execute(
    runId: string,
    input: { product: ProductKey; suite: SuiteType; mode: DemoMode },
    artifactDirectory: string
  ): Promise<void> {
    const startedAt = new Date().toISOString();
    try {
      await this.repository.updateDemoRun(runId, { state: 'RUNNING', message: 'Running known local demo runner' });
      const logs = await this.runProcess(runnerFiles[input.product], input.mode, artifactDirectory);
      await fs.writeFile(path.join(artifactDirectory, 'logs.txt'), sanitizeDiagnostic(logs) ?? 'Runner produced no console output.');
      await this.repository.updateDemoRun(runId, { state: 'PROCESSING_REPORT', message: 'Processing report through authenticated ingestion API' });

      const rawText = await fs.readFile(path.join(artifactDirectory, 'raw-report.json'), 'utf8');
      const report = JSON.parse(rawText) as unknown;
      const finishedAt = new Date().toISOString();
      const metadata = {
        runId,
        product: input.product,
        suite: input.suite,
        mode: input.mode,
        reportFormat: reportFormats[input.product],
        executionMode: input.product === 'pocketwallet' ? 'MOBILE_HARNESS_DEMO' : 'LOCAL_BROWSER',
        startedAt,
        finishedAt,
        syntheticData: true
      };
      await fs.writeFile(path.join(artifactDirectory, 'metadata.json'), JSON.stringify(metadata, null, 2));

      const token = this.runtimeTokens.get(input.product);
      if (!token) throw new Error('Runtime integration token unavailable');
      const ingestion = await fetch(`${this.apiBaseUrl}/api/products/${input.product}/test-reports`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({
          reportFormat: reportFormats[input.product],
          source: 'DEMO_PIPELINE',
          suiteType: input.suite,
          branch: 'demo/local',
          commitSha: 'local-demo',
          pipelineId: runId,
          pipelineUrl: `${this.apiBaseUrl}/api/demo/runs/${runId}`,
          jobId: `${input.product}-${runId}`,
          jobName: `${displayName(input.product)} ${input.suite.toLowerCase()} demo`,
          jobUrl: `${this.apiBaseUrl}/api/demo/runs/${runId}`,
          artifactUrl: `${this.apiBaseUrl}/api/demo/runs/${runId}`,
          environment: 'local-demo',
          startedAt,
          finishedAt,
          report
        })
      });
      if (!ingestion.ok) {
        const payload = await ingestion.text();
        throw new Error(`Ingestion API returned ${ingestion.status}: ${payload}`);
      }
      const accepted = await ingestion.json() as { executionId: string };
      const detailsResponse = await fetch(`${this.apiBaseUrl}/api/executions/${accepted.executionId}`);
      if (!detailsResponse.ok) throw new Error('Unable to retrieve normalized execution after ingestion');
      const normalized = await detailsResponse.json();
      await fs.writeFile(path.join(artifactDirectory, 'normalized-report.json'), JSON.stringify(normalized, null, 2));
      await this.repository.updateDemoRun(runId, {
        state: 'COMPLETED',
        message: 'Completed',
        executionId: accepted.executionId
      });
    } catch (error) {
      const message = sanitizeDiagnostic(error instanceof Error ? error.message : String(error)) ?? 'Demo job failed';
      await fs.writeFile(path.join(artifactDirectory, 'logs.txt'), message).catch(() => undefined);
      await this.repository.updateDemoRun(runId, { state: 'FAILED', message: 'Failed', error: message });
    }
  }

  private runProcess(runner: string, mode: DemoMode, artifactDirectory: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const output: string[] = [];
      const child = spawn(process.execPath, [runner, mode, artifactDirectory], {
        cwd: repositoryRoot,
        env: { ...process.env, DEMO_TARGET_URL: 'http://127.0.0.1:5173' },
        shell: false,
        windowsHide: true
      });
      child.stdout.on('data', (chunk) => output.push(String(chunk)));
      child.stderr.on('data', (chunk) => output.push(String(chunk)));
      child.once('error', reject);
      child.once('exit', (code) => {
        if (code === 0) resolve(output.join(''));
        else reject(new Error(`Known demo runner exited with code ${code}. ${output.join('').slice(-2_000)}`));
      });
    });
  }
}
