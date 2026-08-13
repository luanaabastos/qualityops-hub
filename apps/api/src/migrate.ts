import { Database } from './database.js';

const database = new Database();
try {
  await database.initialize();
  console.log(JSON.stringify({ event: 'migration_deploy_complete' }));
} finally {
  await database.close();
}
