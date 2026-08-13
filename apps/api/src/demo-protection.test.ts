import { describe, expect, it } from 'vitest';
import { DemoConcurrencyLimiter, DemoRequestLimiter } from './demo-protection.js';

describe('hosted Pipeline Lab protection', () => {
  it('bounds concurrent work and releases capacity exactly once', () => {
    const limiter = new DemoConcurrencyLimiter(2);
    const first = limiter.acquire();
    const second = limiter.acquire();
    expect(first).toBeTypeOf('function');
    expect(second).toBeTypeOf('function');
    expect(limiter.acquire()).toBeNull();
    first?.();
    first?.();
    expect(limiter.activeCount).toBe(1);
    expect(limiter.acquire()).toBeTypeOf('function');
  });

  it('enforces a per-client cooldown and rolling request cap', () => {
    const limiter = new DemoRequestLimiter(2, 60_000, 10_000);
    expect(limiter.check('visitor', 1_000)).toEqual({ allowed: true });
    expect(limiter.check('visitor', 2_000)).toEqual({ allowed: false, retryAfterMs: 9_000 });
    expect(limiter.check('visitor', 11_000)).toEqual({ allowed: true });
    expect(limiter.check('visitor', 21_000)).toMatchObject({ allowed: false });
    expect(limiter.check('other-visitor', 21_000)).toEqual({ allowed: true });
  });
});
