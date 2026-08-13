import { describe, expect, it } from 'vitest';
import { calculateApprovalRate, calculateQualityScore } from '@qualityops-hub/shared';

describe('shared metrics', () => {
  it('calculates approval rate correctly', () => {
    expect(calculateApprovalRate(80, 100)).toBe(80);
    expect(calculateApprovalRate(0, 0)).toBeNull();
  });

  it('calculates quality score with penalties', () => {
    expect(calculateQualityScore(90, 100, 1)).toBe(80);
  });
});
