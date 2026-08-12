export * from './types';
export * from './demo-data';

export function calculateApprovalRate(passed: number, executed: number): number {
  if (executed === 0) return 0;
  return Number(((passed / executed) * 100).toFixed(1));
}

export function calculateQualityScore(passed: number, failed: number, infrastructureErrors: number, executed: number): number {
  if (executed === 0) return 0;

  const adjusted = passed - failed * 1.5 - infrastructureErrors * 2;
  const score = (Math.max(adjusted, 0) / executed) * 100;
  return Number(Math.min(score, 100).toFixed(1));
}
