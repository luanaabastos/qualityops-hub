import { describe, expect, it } from 'vitest';
import {
  calculateApprovalRate,
  calculateFreshness,
  calculateQualityScore,
  calculateRegressionDelta,
  createStableTestKey
} from './index';

describe('shared quality semantics', () => {
  it('does not represent no execution as zero percent', () => {
    expect(calculateApprovalRate(80, 100)).toBe(80);
    expect(calculateApprovalRate(0, 0)).toBeNull();
    expect(calculateQualityScore(0, 0, 1)).toBeNull();
  });

  it('uses an explicit and capped infrastructure penalty', () => {
    expect(calculateQualityScore(90, 100, 1)).toBe(80);
  });

  it('creates stable, delimiter-safe identities without obvious collisions', () => {
    const first = createStableTestKey({ framework: 'Cypress', file: 'a/b.cy.ts', suitePath: ['A', 'B'], title: 'C' });
    const same = createStableTestKey({ framework: 'cypress', file: 'a\\b.cy.ts', suitePath: ['a', 'b'], title: 'c' });
    const different = createStableTestKey({ framework: 'Cypress', file: 'a/b.cy.ts', suitePath: ['A'], title: 'B / C' });
    expect(first).toBe(same);
    expect(first).not.toBe(different);
  });

  it('computes both failure transitions and test-set changes', () => {
    expect(calculateRegressionDelta(
      [{ stableKey: 'persistent', status: 'FAILED' }, { stableKey: 'recovered', status: 'FAILED' }, { stableKey: 'removed', status: 'PASSED' }],
      [{ stableKey: 'persistent', status: 'FAILED' }, { stableKey: 'recovered', status: 'PASSED' }, { stableKey: 'new-fail', status: 'FAILED' }]
    )).toEqual({ newFailures: 1, recovered: 1, persistentFailures: 1, newTests: 1, removedTests: 1 });
  });

  it('applies freshness policy thresholds', () => {
    const now = new Date('2026-08-12T12:00:00.000Z');
    expect(calculateFreshness('2026-08-12T00:00:00.000Z', 24, now)).toBe('FRESH');
    expect(calculateFreshness('2026-08-11T00:00:00.000Z', 24, now)).toBe('STALE');
    expect(calculateFreshness('2026-08-09T00:00:00.000Z', 24, now)).toBe('OVERDUE');
  });
});
