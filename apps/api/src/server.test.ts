import { describe, expect, it } from 'vitest';
import { app } from './server.js';
import { calculateRegressionDelta } from './routes.js';

describe('api server', () => {
  it('exposes health endpoint', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('ok');
  });

  it('exposes dashboard endpoint', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/dashboard' });
    expect(response.statusCode).toBe(200);
    expect(response.json().productsSummary).toHaveLength(3);
  });

  it('reports only dependencies required by demo mode as ready', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/readiness' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ready',
      mode: 'demo',
      demoData: 'ready',
      database: 'not-required',
      objectStorage: 'not-required'
    });
  });
});

describe('regression delta', () => {
  it('compares scenarios by stable identity across executions', () => {
    const previous = [
      { scenarioId: 'stable-checkout-id', status: 'FAILED' as const },
      { scenarioId: 'stable-search-id', status: 'PASSED' as const },
      { scenarioId: 'stable-profile-id', status: 'FAILED' as const }
    ];
    const current = [
      { scenarioId: 'stable-checkout-id', status: 'FAILED' as const },
      { scenarioId: 'stable-search-id', status: 'FAILED' as const },
      { scenarioId: 'stable-profile-id', status: 'PASSED' as const },
      { scenarioId: 'new-scenario-id', status: 'PASSED' as const }
    ];

    expect(calculateRegressionDelta(previous, current)).toEqual({
      newFailures: 1,
      recoveredTests: 1,
      persistentFailures: 1,
      newTests: 1
    });
  });
});
