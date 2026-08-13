import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { productKeySchema, type ProductKey } from '@qualityops-hub/shared';
import type { QualityRepository } from './repository.js';

const scrypt = promisify(scryptCallback);
const tokenPattern = /^qoh_(shopsphere|servicedesk|pocketwallet)_([0-9a-f-]{36})_([A-Za-z0-9_-]+)$/;

async function derive(raw: string, salt: string): Promise<Buffer> {
  return scrypt(raw, salt, 32) as Promise<Buffer>;
}

export class IntegrationTokenService {
  constructor(private readonly repository: QualityRepository) {}

  async create(productKey: ProductKey, rotatedFromId?: string | null): Promise<{ id: string; token: string }> {
    const id = randomUUID();
    const secret = randomBytes(32).toString('base64url');
    const token = `qoh_${productKey}_${id}_${secret}`;
    const salt = randomBytes(16).toString('hex');
    const hash = (await derive(token, salt)).toString('hex');
    await this.repository.insertToken({ id, productKey, prefix: `qoh_${productKey}`, hash, salt, rotatedFromId });
    return { id, token };
  }

  async rotate(productKey: ProductKey): Promise<{ id: string; token: string }> {
    const previous = await this.repository.latestActiveToken(productKey);
    await this.repository.revokeTokens(productKey);
    return this.create(productKey, previous?.id ?? null);
  }

  async revoke(productKey: ProductKey): Promise<number> {
    return this.repository.revokeTokens(productKey);
  }

  async authenticate(raw: string, expectedProduct: ProductKey): Promise<boolean> {
    const match = tokenPattern.exec(raw);
    if (!match) return false;
    const parsedProduct = productKeySchema.safeParse(match[1]);
    if (!parsedProduct.success || parsedProduct.data !== expectedProduct) return false;
    const record = await this.repository.tokenById(match[2]);
    if (!record || record.revoked_at || record.product_key !== expectedProduct) return false;
    const candidate = await derive(raw, record.salt);
    const expected = Buffer.from(record.token_hash, 'hex');
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  }
}

export function bearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1] ?? null;
}
