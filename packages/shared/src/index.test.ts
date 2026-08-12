import { describe, expect, it } from 'vitest';
import { calculateApprovalRate, calculateQualityScore } from './index';

describe('shared metrics', () => {
  it('calculates approval rate correctly', () => {
    expect(calculateApprovalRate(80, 100)).toBe(80);
    expect(calculateApprovalRate(0, 0)).toBe(0);
  });

  it('calculates quality score with penalties', () => {
    expect(calculateQualityScore(90, 5, 1, 100)).toBe(80.5);
  });
});
