import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from './api';
import { demoPollingDelay, pollDemoRun } from './demo-polling';
import type { DemoRun } from './types';

function demoRun(state: DemoRun['state'], executionId: string | null = null): DemoRun {
  return {
    runId: 'run-1', product: 'shopsphere', suite: 'REGRESSION', mode: 'SUCCESS', state,
    progressMessage: state, executionId, runnerMode: 'local', previewStatus: null, error: null
  };
}

function options(responses: Array<DemoRun | Error>, controller = new AbortController()) {
  const states: DemoRun['state'][] = [];
  const messages: Array<string | null> = [];
  const results: string[] = [];
  const delays: number[] = [];
  const fetchRun = vi.fn(async () => {
    const response = responses.shift();
    if (response instanceof Error) throw response;
    if (!response) throw new Error('No polling response configured');
    return { run: response };
  });
  return {
    controller, states, messages, results, delays, fetchRun,
    poll: () => pollDemoRun({
      runId: 'run-1', signal: controller.signal, fetchRun,
      fetchExecution: async () => ({ execution: 'final-result' }),
      onRun: (run) => states.push(run.state),
      onResult: (result) => results.push(result),
      onMessage: (message) => messages.push(message),
      baseDelayMs: 1,
      wait: async (delay) => { delays.push(delay); }
    })
  };
}

describe('Pipeline Lab polling', () => {
  it('follows queued, running, processing and completed without overlapping runs', async () => {
    const context = options([
      demoRun('QUEUED'), demoRun('RUNNING'), demoRun('PROCESSING_REPORT'), demoRun('COMPLETED', 'execution-1')
    ]);
    await context.poll();
    expect(context.states).toEqual(['QUEUED', 'RUNNING', 'PROCESSING_REPORT', 'COMPLETED']);
    expect(context.results).toEqual(['final-result']);
    expect(context.fetchRun).toHaveBeenCalledTimes(4);
  });

  it('recovers from a temporary 500 and clears the stale polling message on completion', async () => {
    const context = options([
      new ApiRequestError(500, '/api/demo/runs/run-1'), demoRun('RUNNING'), demoRun('COMPLETED', 'execution-1')
    ]);
    await context.poll();
    expect(context.messages).toContain('Temporarily unable to refresh this run. Retrying...');
    expect(context.messages.at(-1)).toBeNull();
    expect(context.results).toEqual(['final-result']);
  });

  it('backs off after 429 and still reaches completed', async () => {
    const context = options([
      new ApiRequestError(429, '/api/demo/runs/run-1'), demoRun('COMPLETED', 'execution-1')
    ]);
    await context.poll();
    expect(context.delays[1]).toBeGreaterThan(context.delays[0]);
    expect(context.results).toEqual(['final-result']);
    expect(demoPollingDelay(1, 429, 1_000)).toBe(5_000);
  });

  it('treats a real 404 as terminal and does not create or poll another run', async () => {
    const context = options([new ApiRequestError(404, '/api/demo/runs/run-1')]);
    await context.poll();
    expect(context.fetchRun).toHaveBeenCalledTimes(1);
    expect(context.messages.at(-1)).toBe('This demo run could not be found.');
  });

  it('recovers from a network timeout and renders the terminal run', async () => {
    const context = options([new DOMException('Timed out', 'TimeoutError'), demoRun('COMPLETED', 'execution-1')]);
    await context.poll();
    expect(context.results).toEqual(['final-result']);
    expect(context.messages.at(-1)).toBeNull();
  });

  it.each(['FAILED', 'ERROR'] as const)('stops at terminal %s without fetching an execution', async (state) => {
    const context = options([demoRun(state)]);
    await context.poll();
    expect(context.states).toEqual([state]);
    expect(context.results).toEqual([]);
    expect(context.fetchRun).toHaveBeenCalledTimes(1);
  });
});
