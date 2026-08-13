import { describe, expect, it } from 'vitest';
import { executionKeys, reportContentHash } from './security.js';

describe('content hashing and explicit NULL idempotency', () => {
  it('hashes semantically identical object key order identically', () => {
    expect(reportContentHash({ b: 2, a: 1 })).toBe(reportContentHash({ a: 1, b: 2 }));
  });

  it('includes content hash only in the full identity', () => {
    const base = { productKey: 'shopsphere' as const, pipelineId: null, jobId: null, reportFormat: 'mochawesome' as const };
    const first = executionKeys({ ...base, contentHash: 'one' });
    const second = executionKeys({ ...base, contentHash: 'two' });
    expect(first.baseKey).toBe(second.baseKey);
    expect(first.identityKey).not.toBe(second.identityKey);
  });
});
