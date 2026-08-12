import Fastify from 'fastify';
import cors from '@fastify/cors';
import { demoProducts, qualitySummary } from '@qualityops-hub/shared';

const app = Fastify({ logger: false });

await app.register(cors, { origin: true });

app.get('/api/health', async () => ({
  status: 'ok',
  service: 'qualityops-api',
  timestamp: new Date().toISOString()
}));

app.get('/api/readiness', async () => ({
  status: 'ready',
  database: 'ok',
  objectStorage: 'ok',
  backgroundJobs: 'ok'
}));

app.get('/api/dashboard', async () => ({
  ...qualitySummary,
  products: demoProducts
}));

app.get('/api/products', async () => ({
  products: demoProducts
}));

const start = async () => {
  try {
    const address = await app.listen({ port: 3001, host: '0.0.0.0' });
    console.log(`API listening on ${address}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { app };
