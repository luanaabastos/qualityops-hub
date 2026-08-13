import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import { demoRunRequestSchema, productKeySchema, reportIngestionSchema } from '@qualityops-hub/shared';
import { Database } from './database.js';
import { DemoJobService } from './demo-jobs.js';
import { ReportIngestionService } from './ingestion-service.js';
import { IdempotencyConflictError, QualityRepository } from './repository.js';
import { seedDemoHistory } from './seed.js';
import { bearerToken, IntegrationTokenService } from './token-service.js';

type BuildOptions = {
  database?: Database;
  demoEnabled?: boolean;
  seed?: boolean;
  apiBaseUrl?: string;
};

export async function buildApp(options: BuildOptions = {}): Promise<FastifyInstance> {
  const database = options.database ?? new Database();
  await database.initialize();
  const repository = new QualityRepository(database);
  await repository.seedProducts();
  if (options.seed !== false) await seedDemoHistory(database, repository);

  const app = Fastify({ logger: false, bodyLimit: 10 * 1024 * 1024 });
  await app.register(cors, { origin: true });
  const tokenService = new IntegrationTokenService(repository);
  const ingestionService = new ReportIngestionService(repository);
  const demoEnabled = options.demoEnabled ?? process.env.DEMO_PIPELINE_LAB_ENABLED === 'true';
  const demoJobs = new DemoJobService(repository, tokenService, options.apiBaseUrl ?? 'http://127.0.0.1:3001');
  if (demoEnabled) await demoJobs.initialize();

  app.get('/api/health', async () => ({ status: 'ok', service: 'qualityops-api', timestamp: new Date().toISOString() }));
  app.get('/api/readiness', async (_request, reply) => {
    const ready = await database.isReady();
    reply.code(ready ? 200 : 503);
    return { status: ready ? 'ready' : 'not-ready', mode: 'postgresql', database: ready ? 'ready' : 'unavailable', backgroundJobs: demoEnabled ? 'ready' : 'disabled' };
  });

  app.get('/api/dashboard', async () => repository.dashboard());
  app.get('/api/products', async () => ({ products: await repository.listProducts() }));
  app.get('/api/products/:key', async (request, reply) => {
    const product = await repository.getProduct((request.params as { key: string }).key);
    if (!product) return reply.code(404).send({ error: 'Product not found' });
    return { product };
  });
  app.get('/api/products/:key/executions', async (request, reply) => {
    const key = productKeySchema.safeParse((request.params as { key: string }).key);
    if (!key.success) return reply.code(404).send({ error: 'Product not found' });
    return { executions: await repository.listExecutions(key.data) };
  });
  app.get('/api/executions', async () => ({ executions: await repository.listExecutions() }));
  app.get('/api/executions/:id', async (request, reply) => {
    const execution = await repository.getExecution((request.params as { id: string }).id);
    if (!execution) return reply.code(404).send({ error: 'Execution not found' });
    return { execution };
  });

  app.post('/api/products/:productKey/test-reports', async (request, reply) => {
    const product = productKeySchema.safeParse((request.params as { productKey: string }).productKey);
    if (!product.success) return reply.code(404).send({ error: 'Product not found' });
    const rawToken = bearerToken(request.headers.authorization);
    if (!rawToken || !(await tokenService.authenticate(rawToken, product.data))) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    try {
      const body = reportIngestionSchema.parse(request.body);
      const artifactPath = body.source === 'DEMO_PIPELINE' && body.pipelineId && /^[0-9a-f-]{36}$/.test(body.pipelineId)
        ? path.posix.join('artifacts', 'demo-runs', body.pipelineId)
        : null;
      const result = await ingestionService.ingest(product.data, body, artifactPath);
      return reply.code(result.duplicate ? 200 : 201).send({
        executionId: result.id,
        duplicate: result.duplicate,
        status: result.normalized.status,
        summary: result.normalized.summary,
        contentHash: result.contentHash
      });
    } catch (error) {
      if (error instanceof IdempotencyConflictError) {
        return reply.code(409).send({ error: error.message, existingExecutionId: error.existingExecutionId });
      }
      if (error instanceof ZodError) return reply.code(400).send({ error: 'Invalid report payload', issues: error.issues });
      return reply.code(400).send({ error: error instanceof Error ? error.message : 'Report ingestion failed' });
    }
  });

  if (demoEnabled) {
    app.post('/api/demo/runs', async (request, reply) => {
      const parsed = demoRunRequestSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: 'Invalid demo run request', issues: parsed.error.issues });
      return reply.code(202).send({ run: await demoJobs.enqueue(parsed.data) });
    });
    app.get('/api/demo/runs', async () => ({ runs: await repository.listDemoRuns() }));
    app.get('/api/demo/runs/:runId', async (request, reply) => {
      const run = await repository.getDemoRun((request.params as { runId: string }).runId);
      if (!run) return reply.code(404).send({ error: 'Demo run not found' });
      return { run };
    });
  }

  app.addHook('onClose', async () => database.close());
  return app;
}

const isMainModule = process.argv[1]
  ? path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])
  : false;

if (isMainModule) {
  const app = await buildApp();
  try {
    const address = await app.listen({ port: 3001, host: '0.0.0.0' });
    console.log(`API listening on ${address}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
