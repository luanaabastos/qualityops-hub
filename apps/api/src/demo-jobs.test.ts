import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { repositoryRoot } from './database.js';
import { createDemoJobController, demoRunnerEnvironment, demoTimeoutReport, DemoJobService } from './demo-jobs.js';
import type { QualityRepository } from './repository.js';

describe('demo runner process isolation', () => {
  it('forwards only the operating-system allowlist and explicit target URL', () => {
    const environment = demoRunnerEnvironment({
      PATH: 'safe-path',
      DATABASE_URL: 'must-not-cross-process-boundary',
      DEMO_SYSTEM_TOKEN: 'must-not-cross-process-boundary',
      PUBLIC_APP_URL: 'must-not-cross-process-boundary',
      CI: 'true'
    }, 'https://qualityops.example');
    expect(environment).toEqual({
      PATH: 'safe-path',
      CI: 'true',
      DEMO_TARGET_URL: 'https://qualityops.example'
    });
  });

  it('kills an over-time runner and produces adapter-compatible infrastructure reports', async () => {
    const service = new DemoJobService({} as QualityRepository, {
      apiBaseUrl: 'http://127.0.0.1:1',
      targetUrl: 'http://127.0.0.1:1',
      systemToken: 'test-only',
      maxConcurrentRuns: 1,
      timeoutMs: 200
    });
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'qualityops-timeout-'));
    const runner = path.join(repositoryRoot, 'apps', 'api', 'src', 'test-fixtures', 'hanging-runner.mjs');
    try {
      const result = await (service as unknown as {
        runProcess(file: string, mode: 'SUCCESS', artifactDirectory: string): Promise<{ logs: string; timedOut: boolean }>;
      }).runProcess(runner, 'SUCCESS', directory);
      expect(result.timedOut).toBe(true);
      expect(result.logs).toContain('Runner timed out after 200 ms.');
      const pid = Number(await fs.readFile(path.join(directory, 'child.pid'), 'utf8'));
      await expect.poll(() => {
        try { process.kill(pid, 0); return true; } catch { return false; }
      }, { timeout: 5_000 }).toBe(false);
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }

    expect(demoTimeoutReport('shopsphere')).toMatchObject({ knownTotal: 5, infrastructureError: { message: expect.any(String) } });
    expect(demoTimeoutReport('servicedesk')).toMatchObject({ version: 'playwright-json-v1', tests: [], infrastructureError: { message: expect.any(String) } });
    expect(demoTimeoutReport('pocketwallet')).toMatchObject({ version: 'mobile-e2e-json-v1', executed: 0, infrastructureError: { message: expect.any(String) } });
  });
});

describe('explicit demo runner modes', () => {
  it.each(['shopsphere', 'servicedesk'] as const)(
    'keeps the %s hosted preview inside the API process without creating an official execution',
    async (product) => {
      let storedRun: Record<string, unknown> | null = null;
      const updates: Array<Record<string, unknown>> = [];
      const repository = {
        failInterruptedDemoRuns: vi.fn(async () => 0),
        createDemoRun: vi.fn(async (input: Record<string, unknown>) => {
          storedRun = {
            runId: input.id,
            product: input.product,
            suite: input.suite,
            mode: input.mode,
            state: 'QUEUED',
            progressMessage: 'Queued',
            executionId: null,
            runnerMode: input.runnerMode,
            previewStatus: input.previewStatus,
            error: null
          };
        }),
        updateDemoRun: vi.fn(async (_id: string, values: Record<string, unknown>) => {
          updates.push(values);
          storedRun = { ...(storedRun ?? {}), state: values.state, progressMessage: values.message };
        }),
        getDemoRun: vi.fn(async () => storedRun)
      } as unknown as QualityRepository;
      const localFactory = vi.fn(() => {
        throw new Error('local browser factory must not run in hosted-preview mode');
      });
      const controller = createDemoJobController('hosted-preview', repository, localFactory, {
        transitionDelayMs: 0
      });

      await controller.initialize();
      const queued = await controller.enqueue({ product, suite: 'REGRESSION', mode: 'SUCCESS' });
      expect(queued).toMatchObject({
        runnerMode: 'hosted-preview',
        previewStatus: 'EXTERNAL_CI_INTEGRATION_PENDING',
        executionId: null
      });
      await vi.waitFor(() => expect(updates.at(-1)).toMatchObject({ state: 'COMPLETED' }));
      expect(localFactory).not.toHaveBeenCalled();
      expect(updates.some((update) => 'executionId' in update)).toBe(false);
      expect(JSON.stringify(updates)).toContain('no official execution was created');
    }
  );

  it('uses the real runner factory only in local mode', () => {
    const local = { initialize: vi.fn(), enqueue: vi.fn() };
    const localFactory = vi.fn(() => local);
    expect(createDemoJobController('local', {} as QualityRepository, localFactory)).toBe(local);
    expect(localFactory).toHaveBeenCalledOnce();
  });
});
