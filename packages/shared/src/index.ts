export * from './types.js';
export * from './demo-data.js';

export function calculateApprovalRate(passed: number, executed: number): number | null {
  if (executed === 0) return null;
  return Number(((passed / executed) * 100).toFixed(1));
}

/**
 * Audit-friendly score: approval rate minus a 10 point penalty per
 * infrastructure error, capped at 30 points. No execution has no score.
 */
export function calculateQualityScore(
  passed: number,
  executed: number,
  infrastructureErrors: number
): number | null {
  const approval = calculateApprovalRate(passed, executed);
  if (approval === null) return null;
  return Number(Math.max(0, approval - Math.min(30, infrastructureErrors * 10)).toFixed(1));
}

export function createStableTestKey(input: {
  framework: string;
  file: string;
  suitePath: string[];
  title: string;
}): string {
  return JSON.stringify([
    input.framework.trim().toLowerCase(),
    input.file.replaceAll('\\', '/').trim().toLowerCase(),
    input.suitePath.map((part) => part.trim().toLowerCase()),
    input.title.trim().toLowerCase()
  ]);
}

type DeltaCase = { stableKey: string; status: string };

export type RegressionDelta = {
  newFailures: number;
  recovered: number;
  persistentFailures: number;
  newTests: number;
  removedTests: number;
};

export function calculateRegressionDelta(previous: DeltaCase[], current: DeltaCase[]): RegressionDelta {
  const before = new Map(previous.map((test) => [test.stableKey, test]));
  const after = new Map(current.map((test) => [test.stableKey, test]));
  const delta: RegressionDelta = {
    newFailures: 0,
    recovered: 0,
    persistentFailures: 0,
    newTests: 0,
    removedTests: 0
  };

  for (const test of current) {
    const prior = before.get(test.stableKey);
    if (!prior) {
      delta.newTests += 1;
      if (test.status === 'FAILED') delta.newFailures += 1;
      continue;
    }
    if (test.status === 'FAILED' && prior.status === 'FAILED') delta.persistentFailures += 1;
    else if (test.status === 'FAILED') delta.newFailures += 1;
    else if (prior.status === 'FAILED') delta.recovered += 1;
  }

  for (const test of previous) {
    if (!after.has(test.stableKey)) delta.removedTests += 1;
  }
  return delta;
}

export function calculateFreshness(lastExecutionAt: string | null, targetHours: number, now = new Date()): 'FRESH' | 'STALE' | 'OVERDUE' {
  if (!lastExecutionAt) return 'OVERDUE';
  const ageHours = Math.max(0, now.getTime() - new Date(lastExecutionAt).getTime()) / 3_600_000;
  if (ageHours <= targetHours) return 'FRESH';
  if (ageHours <= targetHours * 2) return 'STALE';
  return 'OVERDUE';
}
