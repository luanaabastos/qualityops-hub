import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { repositoryRoot } from './database.js';
import { demoRunnerEnvironment, demoTimeoutReport, DemoJobService } from './demo-jobs.js';
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
