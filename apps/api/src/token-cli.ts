import { productKeySchema } from '@qualityops-hub/shared';
import { Database } from './database.js';
import { QualityRepository } from './repository.js';
import { IntegrationTokenService } from './token-service.js';

const action = process.argv[2];
const productIndex = process.argv.indexOf('--product');
const product = productKeySchema.safeParse(productIndex >= 0 ? process.argv[productIndex + 1] : undefined);

if (!['create', 'rotate', 'revoke'].includes(action ?? '') || !product.success) {
  console.error('Usage: <create|rotate|revoke> --product <shopsphere|servicedesk|pocketwallet>');
  process.exit(1);
}

const database = new Database();
try {
  await database.initialize();
  const repository = new QualityRepository(database);
  await repository.seedProducts();
  const service = new IntegrationTokenService(repository);
  if (action === 'revoke') {
    const revoked = await service.revoke(product.data);
    console.log(`Revoked ${revoked} active token(s) for ${product.data}.`);
  } else {
    const created = action === 'rotate' ? await service.rotate(product.data) : await service.create(product.data);
    console.log(`Integration token for ${product.data} (shown once):`);
    console.log(created.token);
  }
} finally {
  await database.close();
}
