import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

describe('App shell', () => {
  beforeEach(() => {
    const fetchMock = vi.fn<typeof fetch>(async () => ({
      ok: true,
      json: async () => ({
        qualityScore: 88.9,
        approvalRate: 93.5,
        testsExecuted: 110,
        passed: 103,
        failed: 5,
        infrastructureErrors: 1,
        products: 3,
        productsWithRecentExecution: 2,
        productsStale: 1,
        automationCoverage: null,
        latestRegression: '2026-08-11T21:45:00.000Z',
        productsSummary: [
          {
            key: 'shopsphere',
            name: 'ShopSphere',
            framework: 'Cypress',
            status: 'ACTIVE',
            total: 46,
            executed: 46,
            passed: 43,
            failed: 3,
            skipped: 0,
            infrastructureErrors: 0,
            approvalRate: 93.5,
            freshness: 'FRESH',
            lastExecutionAt: '2026-08-12T06:15:00.000Z',
            branch: 'release/august',
            pipeline: 'shopsphere-regression-318',
            commit: 'a8e7d13',
            statusLabel: 'Demo active production-like run'
          }
        ]
      })
    }) as Response);

    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the QualityOps Hub heading', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: /QualityOps Hub/i })).toBeTruthy();
  });
});
