import Fastify from 'fastify';
import cors from '@fastify/cors';
import { dashboardPayload, productByKey, executionsForProduct } from './routes.js';

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

app.get('/api/dashboard', async () => dashboardPayload);

app.get('/api/products', async () => ({
  products: dashboardPayload.productsSummary
}));

app.get('/api/products/:key', async (request, reply) => {
  const { key } = request.params as { key: string };
  const product = productByKey(key);

  if (!product) {
    reply.code(404);
    return { error: 'Product not found' };
  }

  return { product };
});

app.get('/api/products/:key/executions', async (request) => {
  const { key } = request.params as { key: string };
  return { executions: executionsForProduct(key) };
});

app.get('/api/executions/:id', async (request) => {
  const { id } = request.params as { id: string };
  const all = dashboardPayload.productsSummary.flatMap((product: (typeof dashboardPayload.productsSummary)[number]) =>
    executionsForProduct(product.key).map((execution: ReturnType<typeof executionsForProduct>[number]) => ({ ...execution, productName: product.name }))
  );
  const execution = all.find((entry: (typeof all)[number]) => entry.id === id);

  if (!execution) {
    return { error: 'Execution not found' };
  }

  return { execution };
});

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
