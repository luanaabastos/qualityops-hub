import { describe, expect, it } from 'vitest';
import { app } from './server.js';

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
});
