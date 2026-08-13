import { describe, expect, it } from 'vitest';
import type { ProductKey } from '@qualityops-hub/shared';
import { IntegrationTokenService } from './token-service.js';

type Stored = { id: string; productKey: ProductKey; hash: string; salt: string; revoked: boolean };

function createRepositoryDouble() {
  const stored: Stored[] = [];
  return {
    stored,
    repository: {
      async insertToken(record: { id: string; productKey: ProductKey; hash: string; salt: string }) {
        stored.push({ id: record.id, productKey: record.productKey, hash: record.hash, salt: record.salt, revoked: false });
      },
      async tokenById(id: string) {
        const item = stored.find((candidate) => candidate.id === id);
        return item ? { id: item.id, product_key: item.productKey, token_hash: item.hash, salt: item.salt, revoked_at: item.revoked ? new Date() : null } : null;
      },
      async latestActiveToken(productKey: ProductKey) {
        const item = [...stored].reverse().find((candidate) => candidate.productKey === productKey && !candidate.revoked);
        return item ? { id: item.id } : null;
      },
      async revokeTokens(productKey: ProductKey) {
        let count = 0;
        for (const item of stored) {
          if (item.productKey === productKey && !item.revoked) { item.revoked = true; count += 1; }
        }
        return count;
      }
    }
  };
}

describe('integration token lifecycle', () => {
  it('stores only a derived hash and authenticates only the matching product', async () => {
    const double = createRepositoryDouble();
    const service = new IntegrationTokenService(double.repository as never);
    const created = await service.create('shopsphere');
    expect(double.stored[0].hash).not.toContain(created.token);
    expect(await service.authenticate(created.token, 'shopsphere')).toBe(true);
    expect(await service.authenticate(created.token, 'servicedesk')).toBe(false);
  });

  it('rotation and revocation invalidate earlier raw tokens', async () => {
    const double = createRepositoryDouble();
    const service = new IntegrationTokenService(double.repository as never);
    const first = await service.create('pocketwallet');
    const second = await service.rotate('pocketwallet');
    expect(await service.authenticate(first.token, 'pocketwallet')).toBe(false);
    expect(await service.authenticate(second.token, 'pocketwallet')).toBe(true);
    expect(await service.revoke('pocketwallet')).toBe(1);
    expect(await service.authenticate(second.token, 'pocketwallet')).toBe(false);
  });
});
