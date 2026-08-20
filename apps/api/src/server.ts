import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { ZodError } from 'zod';
import { demoRunRequestSchema, productKeySchema, reportIngestionSchema } from '@qualityops-hub/shared';
import { bootstrapDemo } from './bootstrap.js';
import { loadRuntimeConfig, RuntimeConfigError, type RuntimeConfig } from './config.js';
import { Database, repositoryRoot } from './database.js';
import { createDemoJobController, DemoJobService, type DemoJobController } from './demo-jobs.js';
import { DemoCapacityError, DemoRequestLimiter } from './demo-protection.js';
import { ReportIngestionService } from './ingestion-service.js';
import { IdempotencyConflictError, QualityRepository } from './repository.js';
import { bearerToken, IntegrationTokenService } from './token-service.js';

type BuildOptions = {
  database?: Database;
  demoEnabled?: boolean;
  seed?: boolean;
  apiBaseUrl?: string;
  serveWeb?: boolean;
  demoJobs?: DemoJobController;
  config?: Partial<RuntimeConfig>;
};

type StartupPhase = 'config_validation' | 'application_build' | 'listen';

const safeStartupMessages: Record<string, string> = {
  EACCES: 'Server binding was denied.',
  EADDRINUSE: 'Server address is already in use.',
  ECONNREFUSED: 'A required dependency refused the connection.',
  ENOENT: 'A required startup file was not found.'
};

export function startupFailureLogLine(error: unknown, phase: StartupPhase): string {
  const candidate = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const candidateName = error instanceof Error ? error.name : 'Error';
  const errorName = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(candidateName) ? candidateName : 'Error';
  const candidateCode = typeof candidate.code === 'string' && /^[A-Z0-9_]{1,64}$/.test(candidate.code)
    ? candidate.code
    : null;
  const errorCode = error instanceof RuntimeConfigError
    ? error.code
    : candidateCode ?? 'STARTUP_ERROR';
  const message = error instanceof RuntimeConfigError
    ? error.message
    : safeStartupMessages[errorCode] ?? 'Application startup failed.';
  return JSON.stringify({ event: 'server_start_failed', phase, errorName, errorCode, message });
}

function secureEqual(candidate: string, expected: string): boolean {
  const candidateHash = createHash('sha256').update(candidate).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}

export async function buildApp(options: BuildOptions = {}): Promise<FastifyInstance> {
  const config = loadRuntimeConfig(process.env, {
    ...options.config,
    demoEnabled: options.demoEnabled ?? options.config?.demoEnabled,
    apiBaseUrl: options.apiBaseUrl ?? options.config?.apiBaseUrl,
    serveWeb: options.serveWeb ?? options.config?.serveWeb
  });
  const database = options.database ?? new Database();
  await database.initialize();
  await bootstrapDemo(database, options.seed !== false);
  const repository = new QualityRepository(database);

  const app = Fastify({
    logger: config.production ? {
      level: process.env.LOG_LEVEL ?? 'info',
      redact: {
        paths: ['req.headers.authorization', 'request.headers.authorization', 'headers.authorization'],
        censor: '[REDACTED]'
      }
    } : false,
    bodyLimit: 10 * 1024 * 1024,
    trustProxy: config.production ? 1 : false
  });
  if (config.allowedOrigins.length > 0) {
    const allowedOrigins = new Set(config.allowedOrigins);
    await app.register(cors, {
      origin(origin, callback) {
        callback(null, !origin || allowedOrigins.has(origin));
      },
      methods: ['GET', 'POST'],
      allowedHeaders: ['content-type', 'authorization']
    });
  }
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('x-frame-options', 'DENY');
    reply.header('referrer-policy', 'no-referrer');
    reply.header('permissions-policy', 'camera=(), microphone=(), geolocation=()');
    reply.header('content-security-policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    if (request.url === '/' || request.url.endsWith('/index.html')) reply.header('cache-control', 'no-store');
  });
  app.addHook('onResponse', async (request, reply) => {
    const params = request.params as Record<string, string> | undefined;
    app.log.info({
      event: 'http_response',
      requestId: request.id,
      method: request.method,
      route: request.routeOptions.url,
      statusCode: reply.statusCode,
      durationMs: Math.round(reply.elapsedTime),
      runId: params?.runId,
      product: params?.productKey ?? params?.key
    });
  });

  const tokenService = new IntegrationTokenService(repository);
  const ingestionService = new ReportIngestionService(repository);
  const demoJobs = options.demoJobs ?? createDemoJobController(
    config.demoRunnerMode,
    repository,
    () => new DemoJobService(repository, {
      apiBaseUrl: config.apiBaseUrl,
      targetUrl: config.publicAppUrl,
      systemToken: config.demoSystemToken,
      maxConcurrentRuns: config.demoMaxConcurrentRuns,
      timeoutMs: config.demoRunTimeoutMs,
      log: (record) => app.log.info(record)
    }),
    { log: (record) => app.log.info(record) }
  );
  const requestLimiter = new DemoRequestLimiter(
    config.demoRateLimitMax,
    config.demoRateLimitWindowMs,
    config.demoRunCooldownMs
  );
  if (config.demoEnabled) await demoJobs.initialize();

  app.get('/api/health', async () => ({ status: 'ok', service: 'qualityops-api', timestamp: new Date().toISOString() }));
  app.get('/api/readiness', async (_request, reply) => {
    const ready = await database.isReady();
    reply.code(ready ? 200 : 503);
    return {
      status: ready ? 'ready' : 'not-ready',
      api: 'ready',
      mode: 'postgresql',
      database: ready ? 'ready' : 'unavailable',
      objectStorage: 'not-configured',
      backgroundJobs: !config.demoEnabled
        ? 'disabled'
        : config.demoRunnerMode === 'hosted-preview'
          ? 'preview'
          : 'ready',
      demoRunnerMode: config.demoRunnerMode
    };
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
    try {
      const body = reportIngestionSchema.parse(request.body);
      if (body.productKey && body.productKey !== product.data) {
        return reply.code(400).send({ error: 'Payload productKey does not match the endpoint product.' });
      }
      const rawToken = bearerToken(request.headers.authorization);
      const isDemoSystem = rawToken !== null
        && body.source === 'DEMO_PIPELINE'
        && secureEqual(rawToken, config.demoSystemToken);
      if (!rawToken || (!isDemoSystem && !(await tokenService.authenticate(rawToken, product.data)))) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
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
      return reply.code(400).send({ error: 'Report ingestion failed' });
    }
  });

  if (config.demoEnabled) {
    app.get('/api/demo/config', async () => ({
      enabled: true,
      runnerMode: config.demoRunnerMode,
      externalCiStatus: config.demoRunnerMode === 'hosted-preview' ? await repository.externalCiStatus() : null
    }));
    app.post('/api/demo/runs', { bodyLimit: 4 * 1024 }, async (request, reply) => {
      const parsed = demoRunRequestSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: 'Invalid demo run request', issues: parsed.error.issues });
      const rate = requestLimiter.check(request.ip);
      if (!rate.allowed) {
        reply.header('retry-after', String(Math.max(1, Math.ceil(rate.retryAfterMs / 1_000))));
        return reply.code(429).send({ error: 'Demo request limit reached. Try again shortly.' });
      }
      try {
        return reply.code(202).send({ run: await demoJobs.enqueue(parsed.data) });
      } catch (error) {
        if (error instanceof DemoCapacityError) {
          reply.header('retry-after', '5');
          return reply.code(429).send({ error: error.message });
        }
        throw error;
      }
    });
    app.get('/api/demo/runs', async () => ({ runs: await repository.listDemoRuns() }));
    app.get('/api/demo/runs/:runId', async (request, reply) => {
      const run = await repository.getDemoRun((request.params as { runId: string }).runId);
      if (!run) return reply.code(404).send({ error: 'Demo run not found' });
      return { run };
    });
  }

  if (config.serveWeb) {
    const webRoot = path.join(repositoryRoot, 'apps', 'web', 'dist');
    await fs.access(path.join(webRoot, 'index.html'));
    await app.register(fastifyStatic, { root: webRoot, index: ['index.html'] });
    app.setNotFoundHandler(async (request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api/') && request.headers.accept?.includes('text/html')) {
        return reply.type('text/html').sendFile('index.html');
      }
      return reply.code(404).send({ error: 'Not found' });
    });
  }

  app.setErrorHandler((error, request, reply) => {
    const candidateStatus = typeof error === 'object' && error !== null && 'statusCode' in error
      ? Number(error.statusCode)
      : 500;
    const statusCode = candidateStatus >= 400 && candidateStatus < 500 ? candidateStatus : 500;
    if (statusCode >= 500) {
      app.log.error({ err: error, requestId: request.id }, 'request_failed');
    }
    const message = statusCode === 413 ? 'Payload too large' : statusCode >= 500 ? 'Internal server error' : 'Invalid request';
    void reply.code(statusCode).send({ error: message, requestId: request.id });
  });

  app.addHook('onClose', async () => database.close());
  return app;
}

const isMainModule = process.argv[1]
  ? path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])
  : false;

if (isMainModule) {
  let startupPhase: StartupPhase = 'config_validation';
  try {
    const config = loadRuntimeConfig();
    startupPhase = 'application_build';
    const app = await buildApp({ config });
    startupPhase = 'listen';
    const address = await app.listen({ port: config.port, host: config.host });
    app.log.info({ event: 'server_started', address, port: config.port, host: config.host });
    if (!config.production) console.log(`API listening on ${address}`);
    let closing = false;
    const shutdown = async (signal: string) => {
      if (closing) return;
      closing = true;
      app.log.info({ event: 'server_shutdown', signal });
      await app.close();
    };
    process.once('SIGINT', () => void shutdown('SIGINT'));
    process.once('SIGTERM', () => void shutdown('SIGTERM'));
  } catch (error) {
    console.error(startupFailureLogLine(error, startupPhase));
    process.exit(1);
  }
}
