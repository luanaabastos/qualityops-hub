import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Database } from './database.js';
import { QualityRepository } from './repository.js';
import { seedDemoHistory } from './seed.js';

export async function bootstrapDemo(database: Database, seedHistory = true): Promise<void> {
  const repository = new QualityRepository(database);
  await repository.seedProducts();
  if (seedHistory) await seedDemoHistory(database, repository);
}

const isMainModule = process.argv[1]
  ? path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])
  : false;

if (isMainModule) {
  const database = new Database();
  try {
    await database.initialize();
    await bootstrapDemo(database, process.env.SEED_DEMO_HISTORY !== 'false');
    console.log(JSON.stringify({ event: 'bootstrap_complete', demoHistory: process.env.SEED_DEMO_HISTORY !== 'false' }));
  } finally {
    await database.close();
  }
}
