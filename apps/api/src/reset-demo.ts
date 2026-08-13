import { Database } from './database.js';
import { QualityRepository } from './repository.js';
import { seedDemoHistory } from './seed.js';

const confirmation = '--confirm-local-demo-reset';
if (!process.argv.includes(confirmation)) {
  console.error(`Demo reset requires explicit confirmation: ${confirmation}`);
  process.exit(2);
}

const connectionString = process.env.DATABASE_URL ?? 'postgresql://qualityops:qualityops@localhost:5432/qualityops_dev';
const target = new URL(connectionString);
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
if (!localHosts.has(target.hostname) || target.pathname !== '/qualityops_dev') {
  console.error('Refusing to reset anything except the local qualityops_dev database.');
  process.exit(2);
}

const database = new Database(connectionString);
try {
  await database.initialize();
  const repository = new QualityRepository(database);
  await repository.resetDemoData();
  await repository.seedProducts();
  await seedDemoHistory(database, repository);
  console.log('LOCAL_DEMO_DATA_RESET=COMPLETE');
} finally {
  await database.close();
}
