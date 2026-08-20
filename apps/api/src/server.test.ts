import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { ProductKey, ReportFormat } from '@qualityops-hub/shared';
import { Database } from './database.js';
import { QualityRepository } from './repository.js';
import { buildApp } from './server.js';
import { DemoCapacityError } from './demo-protection.js';
import { HostedPreviewJobService } from './demo-jobs.js';
import { IntegrationTokenService } from './token-service.js';
import { seedDemoHistory } from './seed.js';

let database: Database;
let repository: QualityRepository;
let tokens: IntegrationTokenService;
let app: FastifyInstance;

const reports: Record<ProductKey, { format: ReportFormat; report: unknown }> = {
  shopsphere: {
    format: 'mochawesome',
    report: { results: [{ title: 'ShopSphere', file: 'shopsphere.cy.ts', tests: [{ title: 'search', state: 'passed', pass: true, duration: 10 }] }] }
  },
  servicedesk: {
    format: 'playwright-json-v1',
    report: { version: 'playwright-json-v1', framework: 'Playwright', infrastructureError: null, tests: [{ file: 'servicedesk.spec.ts', suitePath: ['ServiceDesk'], title: 'open ticket', status: 'passed', durationMs: 12, error: null }] }
  },
  pocketwallet: {
    format: 'mobile-e2e-json-v1',
    report: { version: 'mobile-e2e-json-v1', executionMode: 'MOBILE_HARNESS_DEMO', total: 1, executed: 1, passed: 1, failed: 0, skipped: 0, infrastructureError: null, tests: [{ file: 'harness.mjs', suite: 'PocketWallet', title: 'login', status: 'PASSED', durationMs: 8, error: null }] }
  }
};

function payload(product: ProductKey, pipelineId: string = randomUUID()) {
  const source = reports[product];
  const now = new Date();
  return {
    reportFormat: source.format,
    source: 'LOCAL_CLI',
    suiteType: 'SMOKE',
    branch: 'integration-test',
    commitSha: 'test123',
    pipelineId,
    pipelineUrl: null,
    jobId: `job-${pipelineId}`,
    jobName: 'Integration test',
    jobUrl: null,
    artifactUrl: null,
    environment: 'test',
    startedAt: new Date(now.getTime() - 1_000).toISOString(),
    finishedAt: now.toISOString(),
    report: structuredClone(source.report)
  };
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://qualityops:qualityops@localhost:5432/qualityops_test';
const databaseProbe = new Database(testDatabaseUrl);
const databaseAvailable = await databaseProbe.isReady();
await databaseProbe.close();
const integrationDescribe = databaseAvailable ? describe : describe.skip;

beforeAll(async () => {
  if (!databaseAvailable) return;
  database = new Database(testDatabaseUrl);
  await database.initialize();
  repository = new QualityRepository(database);
  tokens = new IntegrationTokenService(repository);
  app = await buildApp({ database, demoEnabled: false, seed: false });
});

beforeEach(async () => {
  if (!databaseAvailable) return;
  await repository.clearAllForTests();
  await repository.seedProducts();
});

afterAll(async () => { if (databaseAvailable) await app.close(); });

integrationDescribe('API and authenticated report ingestion', () => {
  it('reports PostgreSQL readiness', async () => {
    const health = await app.inject({ method: 'GET', url: '/api/health' });
    const readiness = await app.inject({ method: 'GET', url: '/api/readiness' });
    expect(health.statusCode).toBe(200);
    expect(readiness.statusCode).toBe(200);
    expect(readiness.json()).toMatchObject({
      status: 'ready',
      api: 'ready',
      database: 'ready',
      objectStorage: 'not-configured',
      backgroundJobs: 'disabled',
      demoRunnerMode: 'local'
    });
    expect(health.headers['x-content-type-options']).toBe('nosniff');
    expect(health.headers['x-frame-options']).toBe('DENY');
  });

  it('allows only configured browser origins', async () => {
    const allowed = await app.inject({ method: 'GET', url: '/api/health', headers: { origin: 'http://localhost:5173' } });
    const rejected = await app.inject({ method: 'GET', url: '/api/health', headers: { origin: 'https://untrusted.example' } });
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(rejected.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rejects missing, invalid, revoked and wrong-product bearer tokens', async () => {
    const body = payload('shopsphere');
    expect((await app.inject({ method: 'POST', url: '/api/products/shopsphere/test-reports', payload: body })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/api/products/shopsphere/test-reports', headers: { authorization: 'Bearer invalid' }, payload: body })).statusCode).toBe(401);
    const created = await tokens.create('shopsphere');
    await tokens.revoke('shopsphere');
    expect((await app.inject({ method: 'POST', url: '/api/products/shopsphere/test-reports', headers: { authorization: `Bearer ${created.token}` }, payload: body })).statusCode).toBe(401);
    const wrongProduct = await tokens.create('shopsphere');
    expect((await app.inject({
      method: 'POST',
      url: '/api/products/servicedesk/test-reports',
      headers: { authorization: `Bearer ${wrongProduct.token}` },
      payload: payload('servicedesk')
    })).statusCode).toBe(401);
  });

  it('rejects endpoint/payload product mismatches and product-incompatible report formats', async () => {
    const created = await tokens.create('shopsphere');
    const headers = { authorization: `Bearer ${created.token}` };
    const mismatchedProduct = await app.inject({
      method: 'POST',
      url: '/api/products/shopsphere/test-reports',
      headers,
      payload: { ...payload('shopsphere'), productKey: 'servicedesk' }
    });
    expect(mismatchedProduct.statusCode).toBe(400);
    const wrongFormat = await app.inject({
      method: 'POST',
      url: '/api/products/shopsphere/test-reports',
      headers,
      payload: { ...payload('shopsphere'), productKey: 'shopsphere', reportFormat: 'playwright-json-v1' }
    });
    expect(wrongFormat.statusCode).toBe(400);
  });

  it('accepts the runtime-only Pipeline Lab credential without persisting it', async () => {
    const demoSystemToken = 'production-like-system-token-value-123456789';
    const demoApp = await buildApp({
      database: new Database(testDatabaseUrl),
      demoEnabled: false,
      seed: false,
      config: { demoSystemToken }
    });
    const body = { ...payload('shopsphere'), source: 'DEMO_PIPELINE' };
    const response = await demoApp.inject({
      method: 'POST',
      url: '/api/products/shopsphere/test-reports',
      headers: { authorization: `Bearer ${demoSystemToken}` },
      payload: body
    });
    expect(response.statusCode).toBe(201);
    const stored = await database.pool.query('SELECT COUNT(*) count FROM integration_tokens');
    expect(Number(stored.rows[0].count)).toBe(0);
    await demoApp.close();
  });

  for (const product of ['shopsphere', 'servicedesk', 'pocketwallet'] as const) {
    it(`persists ${reports[product].format} through token -> POST -> DB -> GET`, async () => {
      const created = await tokens.create(product);
      const response = await app.inject({
        method: 'POST',
        url: `/api/products/${product}/test-reports`,
        headers: { authorization: `Bearer ${created.token}` },
        payload: payload(product)
      });
      expect(response.statusCode).toBe(201);
      const accepted = response.json();
      const details = await app.inject({ method: 'GET', url: `/api/executions/${accepted.executionId}` });
      expect(details.statusCode).toBe(200);
      expect(details.json().execution).toMatchObject({ productKey: product, reportFormat: reports[product].format, summary: { executed: 1, passed: 1 } });
      const stored = await database.pool.query('SELECT token_hash, salt FROM integration_tokens WHERE id=$1', [created.id]);
      expect(stored.rows[0].token_hash).not.toContain(created.token);
      expect(JSON.stringify(stored.rows[0])).not.toContain(created.token);
    });
  }

  it('returns the same execution for identical content and 409 for changed content', async () => {
    const created = await tokens.create('shopsphere');
    const body = { ...payload('shopsphere', 'idempotent-pipeline'), productKey: 'shopsphere', source: 'GITHUB_ACTIONS' };
    const headers = { authorization: `Bearer ${created.token}` };
    const replayResponses = await Promise.all([
      app.inject({ method: 'POST', url: '/api/products/shopsphere/test-reports', headers, payload: body }),
      app.inject({ method: 'POST', url: '/api/products/shopsphere/test-reports', headers, payload: body })
    ]);
    const first = replayResponses.find((response) => response.statusCode === 201)!;
    const duplicate = replayResponses.find((response) => response.statusCode === 200)!;
    expect(first).toBeTruthy();
    expect(duplicate).toBeTruthy();
    expect(duplicate.json().executionId).toBe(first.json().executionId);
    const changed = structuredClone(body);
    (changed.report as { results: Array<{ tests: Array<{ title: string }> }> }).results[0].tests[0].title = 'changed test content';
    const conflict = await app.inject({ method: 'POST', url: '/api/products/shopsphere/test-reports', headers, payload: changed });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().existingExecutionId).toBe(first.json().executionId);
  });

  it('normalizes nullable pipeline and job IDs into deterministic identity', async () => {
    const created = await tokens.create('pocketwallet');
    const body = { ...payload('pocketwallet'), pipelineId: null, jobId: null };
    const headers = { authorization: `Bearer ${created.token}` };
    const first = await app.inject({ method: 'POST', url: '/api/products/pocketwallet/test-reports', headers, payload: body });
    const second = await app.inject({ method: 'POST', url: '/api/products/pocketwallet/test-reports', headers, payload: body });
    expect(first.statusCode).toBe(201);
    expect(second.json().executionId).toBe(first.json().executionId);
  });

  it('uses only GitHub Actions runs for official aggregates and keeps same-origin regression history', async () => {
    await seedDemoHistory(database, repository);
    const seededDashboard = await app.inject({ method: 'GET', url: '/api/dashboard' });
    expect(seededDashboard.json()).toMatchObject({
      qualityScore: null,
      approvalRate: null,
      testsExecuted: 0,
      officialProducts: 0
    });
    expect(seededDashboard.json().productsSummary.every((product: { isOfficial: boolean }) => !product.isOfficial)).toBe(true);

    const serviceToken = await tokens.create('servicedesk');
    const serviceBody = { ...payload('servicedesk'), productKey: 'servicedesk', source: 'GITHUB_ACTIONS' };
    const serviceResponse = await app.inject({
      method: 'POST',
      url: '/api/products/servicedesk/test-reports',
      headers: { authorization: `Bearer ${serviceToken.token}` },
      payload: serviceBody
    });
    expect(serviceResponse.statusCode).toBe(201);
    const serviceExecution = await app.inject({ method: 'GET', url: `/api/executions/${serviceResponse.json().executionId}` });
    expect(serviceExecution.json().execution).toMatchObject({
      origin: 'EXTERNAL_CI',
      regressionDelta: { newTests: 1, removedTests: 0 }
    });
    const partialDashboard = await app.inject({ method: 'GET', url: '/api/dashboard' });
    expect(partialDashboard.json()).toMatchObject({ testsExecuted: 1, passed: 1, officialProducts: 1 });
    expect(await repository.externalCiStatus()).toBe('EXTERNAL_CI_INTEGRATION_PENDING');

    const shopToken = await tokens.create('shopsphere');
    const shopResponse = await app.inject({
      method: 'POST',
      url: '/api/products/shopsphere/test-reports',
      headers: { authorization: `Bearer ${shopToken.token}` },
      payload: { ...payload('shopsphere'), productKey: 'shopsphere', source: 'GITHUB_ACTIONS' }
    });
    expect(shopResponse.statusCode).toBe(201);
    expect(await repository.externalCiStatus()).toBe('EXTERNAL_CI_ACTIVE');
    const activePreviewApp = await buildApp({
      database: new Database(testDatabaseUrl),
      demoEnabled: true,
      seed: false,
      demoJobs: new HostedPreviewJobService(repository, { transitionDelayMs: 0 }),
      config: { demoRunnerMode: 'hosted-preview' }
    });
    const activeConfig = await activePreviewApp.inject({ method: 'GET', url: '/api/demo/config' });
    expect(activeConfig.json().externalCiStatus).toBe('EXTERNAL_CI_ACTIVE');
    await activePreviewApp.close();
    const origins = await database.pool.query('SELECT DISTINCT origin FROM test_executions ORDER BY origin');
    expect(origins.rows.map((row) => row.origin)).toEqual(['EXTERNAL_CI', 'SEEDED_DEMO']);
  });

  it('does not register local demo routes when the feature flag is disabled', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/demo/runs', payload: { product: 'shopsphere', suite: 'SMOKE', mode: 'SUCCESS' } });
    expect(response.statusCode).toBe(404);
  });

  it('exposes a hosted preview without adding an official execution', async () => {
    const previewApp = await buildApp({
      database: new Database(testDatabaseUrl),
      demoEnabled: true,
      seed: false,
      demoJobs: new HostedPreviewJobService(repository, { transitionDelayMs: 0 }),
      config: {
        demoRunnerMode: 'hosted-preview',
        demoRunCooldownMs: 0,
        demoRateLimitMax: 10
      }
    });
    const configResponse = await previewApp.inject({ method: 'GET', url: '/api/demo/config' });
    expect(configResponse.json()).toEqual({
      enabled: true,
      runnerMode: 'hosted-preview',
      externalCiStatus: 'EXTERNAL_CI_INTEGRATION_PENDING'
    });

    const queued = await previewApp.inject({
      method: 'POST',
      url: '/api/demo/runs',
      payload: { product: 'shopsphere', suite: 'REGRESSION', mode: 'SUCCESS' }
    });
    expect(queued.statusCode).toBe(202);
    const runId = queued.json().run.runId as string;
    await expect.poll(async () => {
      const response = await previewApp.inject({ method: 'GET', url: `/api/demo/runs/${runId}` });
      return response.json().run.state;
    }).toBe('COMPLETED');
    const completed = await previewApp.inject({ method: 'GET', url: `/api/demo/runs/${runId}` });
    expect(completed.json().run).toMatchObject({
      runnerMode: 'hosted-preview',
      previewStatus: 'EXTERNAL_CI_INTEGRATION_PENDING',
      executionId: null,
      state: 'COMPLETED'
    });
    const storedExecutions = await database.pool.query('SELECT COUNT(*) count FROM test_executions');
    expect(Number(storedExecutions.rows[0].count)).toBe(0);
    await previewApp.close();
  });

  it('rejects Pipeline Lab injection and oversized requests, then returns safe 429 responses', async () => {
    const fakeJobs = {
      initialize: async () => undefined,
      enqueue: async (input: { product: string }) => {
        if (input.product === 'servicedesk') throw new DemoCapacityError();
        return { runId: randomUUID(), state: 'QUEUED' };
      }
    };
    const demoApp = await buildApp({
      database: new Database(testDatabaseUrl),
      demoEnabled: true,
      seed: false,
      demoJobs: fakeJobs,
      config: { demoRunnerMode: 'local', demoRunCooldownMs: 0, demoRateLimitMax: 2, demoRateLimitWindowMs: 60_000 }
    });
    const injection = await demoApp.inject({
      method: 'POST', url: '/api/demo/runs',
      payload: { product: 'shopsphere', suite: 'SMOKE', mode: 'SUCCESS', command: 'arbitrary-command' }
    });
    expect(injection.statusCode).toBe(400);

    for (const invalid of [
      { product: 'arbitrary-product', suite: 'SMOKE', mode: 'SUCCESS' },
      { product: 'shopsphere', suite: 'arbitrary-suite', mode: 'SUCCESS' },
      { product: 'shopsphere', suite: 'SMOKE', mode: 'arbitrary-mode' }
    ]) {
      const response = await demoApp.inject({ method: 'POST', url: '/api/demo/runs', payload: invalid });
      expect(response.statusCode).toBe(400);
    }

    const oversized = await demoApp.inject({
      method: 'POST', url: '/api/demo/runs',
      payload: { product: 'shopsphere', suite: 'SMOKE', mode: 'SUCCESS', padding: 'x'.repeat(5_000) }
    });
    expect(oversized.statusCode).toBe(413);
    expect(oversized.json().error).toBe('Payload too large');

    const capacity = await demoApp.inject({
      method: 'POST', url: '/api/demo/runs',
      payload: { product: 'servicedesk', suite: 'SMOKE', mode: 'SUCCESS' }
    });
    expect(capacity.statusCode).toBe(429);
    expect(capacity.json().error).toBe('Demo capacity reached. Try again shortly.');

    const accepted = await demoApp.inject({
      method: 'POST', url: '/api/demo/runs',
      payload: { product: 'shopsphere', suite: 'SMOKE', mode: 'SUCCESS' }
    });
    expect(accepted.statusCode).toBe(202);
    const rateLimited = await demoApp.inject({
      method: 'POST', url: '/api/demo/runs',
      payload: { product: 'shopsphere', suite: 'SMOKE', mode: 'SUCCESS' }
    });
    expect(rateLimited.statusCode).toBe(429);
    expect(rateLimited.headers['retry-after']).toBeTruthy();
    await demoApp.close();
  });
});
