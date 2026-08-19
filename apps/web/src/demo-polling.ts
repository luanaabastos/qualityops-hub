import type { DemoRun } from './types';

const terminalStates = new Set<DemoRun['state']>(['COMPLETED', 'FAILED', 'ERROR']);
const transientMessage = 'Temporarily unable to refresh this run. Retrying...';

type Wait = (durationMs: number, signal: AbortSignal) => Promise<void>;

type PollDemoRunOptions<Result> = {
  runId: string;
  signal: AbortSignal;
  fetchRun: (runId: string, signal: AbortSignal) => Promise<{ run: DemoRun }>;
  fetchExecution: (executionId: string, signal: AbortSignal) => Promise<{ execution: Result }>;
  onRun: (run: DemoRun) => void;
  onResult: (result: Result) => void;
  onMessage: (message: string | null) => void;
  baseDelayMs?: number;
  wait?: Wait;
};

function statusOf(error: unknown): number | null {
  return error && typeof error === 'object' && 'status' in error && typeof error.status === 'number'
    ? error.status
    : null;
}

export function demoPollingDelay(failureCount: number, status: number | null, baseDelayMs = 2_000): number {
  const exponential = Math.min(baseDelayMs * (2 ** Math.min(failureCount, 3)), 10_000);
  return status === 429 ? Math.max(exponential, 5_000) : exponential;
}

async function waitWithSignal(durationMs: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return;
  await new Promise<void>((resolve) => {
    const finish = () => {
      window.clearTimeout(timeout);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timeout = window.setTimeout(finish, durationMs);
    signal.addEventListener('abort', finish, { once: true });
  });
}

export async function pollDemoRun<Result>(options: PollDemoRunOptions<Result>): Promise<void> {
  const baseDelayMs = options.baseDelayMs ?? 2_000;
  const wait = options.wait ?? waitWithSignal;
  let nextDelayMs = baseDelayMs;
  let consecutiveFailures = 0;

  while (!options.signal.aborted) {
    await wait(nextDelayMs, options.signal);
    if (options.signal.aborted) return;
    try {
      const payload = await options.fetchRun(options.runId, options.signal);
      options.onRun(payload.run);
      options.onMessage(null);
      consecutiveFailures = 0;
      nextDelayMs = baseDelayMs;

      if (!terminalStates.has(payload.run.state)) continue;
      if (payload.run.state === 'COMPLETED' && payload.run.executionId) {
        const details = await options.fetchExecution(payload.run.executionId, options.signal);
        options.onResult(details.execution);
        options.onMessage(null);
      }
      return;
    } catch (error) {
      if (options.signal.aborted) return;
      const status = statusOf(error);
      if (status === 404) {
        options.onMessage('This demo run could not be found.');
        return;
      }
      consecutiveFailures += 1;
      nextDelayMs = demoPollingDelay(consecutiveFailures, status, baseDelayMs);
      options.onMessage(transientMessage);
    }
  }
}
