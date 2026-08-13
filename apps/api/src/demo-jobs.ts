import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { type DemoMode, type ProductKey, type SuiteType } from '@qualityops-hub/shared';
import { repositoryRoot } from './database.js';
import { DemoCapacityError, DemoConcurrencyLimiter } from './demo-protection.js';
import type { QualityRepository } from './repository.js';
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

const forwardedEnvironmentKeys = [
  'PATH', 'Path', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'HOME', 'USERPROFILE',
  'LOCALAPPDATA', 'APPDATA', 'CI', 'PLAYWRIGHT_BROWSERS_PATH', 'CYPRESS_CACHE_FOLDER', 'NODE_ENV'
] as const;
const maximumCapturedOutput = 64 * 1024;

type DemoJobInput = { product: ProductKey; suite: SuiteType; mode: DemoMode };
type DemoJobLog = {
  event: string;
  runId: string;
  product: ProductKey;
  status: string;
  durationMs?: number;
};

export type DemoJobController = {
  initialize(): Promise<void>;
  enqueue(input: DemoJobInput): Promise<Record<string, unknown>>;
};

type DemoJobOptions = {
  apiBaseUrl: string;
  targetUrl: string;
  systemToken: string;
  maxConcurrentRuns: number;
  timeoutMs: number;
  log?: (record: DemoJobLog) => void;
};

function displayName(product: ProductKey): string {
  return product === 'shopsphere' ? 'ShopSphere' : product === 'servicedesk' ? 'ServiceDesk' : 'PocketWallet';
}

export function demoRunnerEnvironment(source: NodeJS.ProcessEnv, targetUrl: string): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { DEMO_TARGET_URL: targetUrl };
  for (const key of forwardedEnvironmentKeys) {
    if (source[key]) environment[key] = source[key];
  }
  return environment;
}

export function demoTimeoutReport(product: ProductKey): unknown {
  const error = { message: 'Hosted demo runner exceeded its execution time limit; tests did not execute.' };
  if (product === 'shopsphere') {
    return { stats: {}, results: [], knownTotal: 5, infrastructureError: error };
  }
  if (product === 'servicedesk') {
    return { version: 'playwright-json-v1', framework: 'Playwright', tests: [], infrastructureError: error };
  }
  return {
    version: 'mobile-e2e-json-v1', executionMode: 'MOBILE_HARNESS_DEMO', total: 5, executed: 0,
    passed: 0, failed: 0, skipped: 0, infrastructureError: error, tests: []
  };
}

export class DemoJobService implements DemoJobController {
  private readonly artifactsRoot = path.join(repositoryRoot, 'artifacts', 'demo-runs');
  private readonly concurrency: DemoConcurrencyLimiter;

  constructor(
    private readonly repository: QualityRepository,
    private readonly options: DemoJobOptions
  ) {
    this.concurrency = new DemoConcurrencyLimiter(options.maxConcurrentRuns);
  }

  async initialize(): Promise<void> {
    const interrupted = await this.repository.failInterruptedDemoRuns();
    if (interrupted > 0) {
      this.options.log?.({ event: 'demo_recovery', runId: 'startup', product: 'shopsphere', status: `failed_${interrupted}_interrupted` });
    }
  }

  async enqueue(input: DemoJobInput): Promise<Record<string, unknown>> {
    const release = this.concurrency.acquire();
    if (!release) throw new DemoCapacityError();
    const runId = randomUUID();
    const artifactDirectory = path.resolve(this.artifactsRoot, runId);
    if (!artifactDirectory.startsWith(`${path.resolve(this.artifactsRoot)}${path.sep}`)) {
      release();
      throw new Error('Unsafe artifact directory');
    }
    try {
      await fs.mkdir(artifactDirectory, { recursive: true });
      const publicArtifactPath = path.posix.join('artifacts', 'demo-runs', runId);
      await this.repository.createDemoRun({ id: runId, ...input, artifactPath: publicArtifactPath });
      setImmediate(() => void this.execute(runId, input, artifactDirectory, release));
      this.options.log?.({ event: 'demo_queued', runId, product: input.product, status: 'QUEUED' });
      return (await this.repository.getDemoRun(runId))!;
    } catch (error) {
      release();
      throw error;
    }
  }

  private async execute(
    runId: string,
    input: DemoJobInput,
    artifactDirectory: string,
    release: () => void
  ): Promise<void> {
    const startedAt = new Date().toISOString();
    const startedAtMs = Date.now();
    try {
      await this.repository.updateDemoRun(runId, { state: 'RUNNING', message: 'Running approved demo runner' });
      const processResult = await this.runProcess(runnerFiles[input.product], input.mode, artifactDirectory);
      await fs.writeFile(
        path.join(artifactDirectory, 'logs.txt'),
        sanitizeDiagnostic(processResult.logs) ?? 'Runner produced no console output.'
      );
      if (processResult.timedOut) {
        await fs.writeFile(path.join(artifactDirectory, 'raw-report.json'), JSON.stringify(demoTimeoutReport(input.product), null, 2));
      }
      await this.repository.updateDemoRun(runId, {
        state: 'PROCESSING_REPORT',
        message: processResult.timedOut ? 'Persisting timeout as an infrastructure error' : 'Processing report through authenticated ingestion API'
      });

      const rawText = await fs.readFile(path.join(artifactDirectory, 'raw-report.json'), 'utf8');
      const report = JSON.parse(rawText) as unknown;
      const finishedAt = new Date().toISOString();
      const metadata = {
        runId,
        product: input.product,
        suite: input.suite,
        mode: input.mode,
        reportFormat: reportFormats[input.product],
        executionMode: input.product === 'pocketwallet' ? 'MOBILE_HARNESS_DEMO' : 'HOSTED_BROWSER',
        startedAt,
        finishedAt,
        syntheticData: true,
        timedOut: processResult.timedOut
      };
      await fs.writeFile(path.join(artifactDirectory, 'metadata.json'), JSON.stringify(metadata, null, 2));

      const ingestion = await fetch(`${this.options.apiBaseUrl}/api/products/${input.product}/test-reports`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.options.systemToken}` },
        body: JSON.stringify({
          reportFormat: reportFormats[input.product],
          source: 'DEMO_PIPELINE',
          suiteType: input.suite,
          branch: 'demo/hosted',
          commitSha: 'hosted-demo',
          pipelineId: runId,
          pipelineUrl: `${this.options.apiBaseUrl}/api/demo/runs/${runId}`,
          jobId: `${input.product}-${runId}`,
          jobName: `${displayName(input.product)} ${input.suite.toLowerCase()} demo`,
          jobUrl: `${this.options.apiBaseUrl}/api/demo/runs/${runId}`,
          artifactUrl: `${this.options.apiBaseUrl}/api/demo/runs/${runId}`,
          environment: process.env.NODE_ENV === 'production' ? 'hosted-demo' : 'local-demo',
          startedAt,
          finishedAt,
          report
        })
      });
      if (!ingestion.ok) throw new Error(`Ingestion API returned status ${ingestion.status}.`);
      const accepted = await ingestion.json() as { executionId: string };
      const detailsResponse = await fetch(`${this.options.apiBaseUrl}/api/executions/${accepted.executionId}`);
      if (!detailsResponse.ok) throw new Error('Unable to retrieve normalized execution after ingestion');
      const normalized = await detailsResponse.json();
      await fs.writeFile(path.join(artifactDirectory, 'normalized-report.json'), JSON.stringify(normalized, null, 2));
      await this.repository.updateDemoRun(runId, { state: 'COMPLETED', message: 'Completed', executionId: accepted.executionId });
      this.options.log?.({
        event: 'demo_completed', runId, product: input.product, status: 'COMPLETED', durationMs: Date.now() - startedAtMs
      });
    } catch (error) {
      const message = sanitizeDiagnostic(error instanceof Error ? error.message : String(error)) ?? 'Demo job failed';
      await fs.writeFile(path.join(artifactDirectory, 'logs.txt'), message).catch(() => undefined);
      await this.repository.updateDemoRun(runId, { state: 'FAILED', message: 'Failed', error: message });
      this.options.log?.({
        event: 'demo_failed', runId, product: input.product, status: 'FAILED', durationMs: Date.now() - startedAtMs
      });
    } finally {
      release();
    }
  }

  private runProcess(
    runner: string,
    mode: DemoMode,
    artifactDirectory: string
  ): Promise<{ logs: string; timedOut: boolean }> {
    return new Promise((resolve, reject) => {
      let output = '';
      let settled = false;
      const child = spawn(process.execPath, [runner, mode, artifactDirectory], {
        cwd: repositoryRoot,
        env: demoRunnerEnvironment(process.env, this.options.targetUrl),
        shell: false,
        windowsHide: true,
        detached: process.platform !== 'win32'
      });
      const capture = (chunk: unknown) => {
        output = `${output}${String(chunk)}`.slice(-maximumCapturedOutput);
      };
      child.stdout.on('data', capture);
      child.stderr.on('data', capture);
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        if (process.platform === 'win32' && child.pid) {
          spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { shell: false, windowsHide: true, stdio: 'ignore' });
        } else if (child.pid) {
          try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
        }
        resolve({ logs: `${output}\nRunner timed out after ${this.options.timeoutMs} ms.`, timedOut: true });
      }, this.options.timeoutMs);
      timer.unref();
      child.once('error', (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
      child.once('exit', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (code === 0) resolve({ logs: output, timedOut: false });
        else reject(new Error(`Approved demo runner exited with code ${code}. ${output.slice(-2_000)}`));
      });
    });
  }
}
