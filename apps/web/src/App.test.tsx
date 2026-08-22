import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App, { formatMetadataValue } from './App';

describe('App shell', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
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
        automationCoverage: 70,
        latestRegression: '2026-08-11T21:45:00.000Z',
        productsSummary: [
          {
            key: 'shopsphere',
            name: 'ShopSphere',
            framework: 'Cypress',
            status: 'ACTIVE',
            executionStatus: 'FAILED',
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

  it('renders the TestOps Hub product introduction', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: /Automated test results, in one place/i })).toBeTruthy();
    expect(screen.getAllByText(/TestOps Hub/i).length).toBeGreaterThan(0);
  });

  it('renders same-origin pipeline URLs as public-safe relative metadata', () => {
    expect(formatMetadataValue('pipelineUrl', 'https://demo.example.test/api/demo/runs/123', 'https://demo.example.test'))
      .toBe('/api/demo/runs/123');
    expect(formatMetadataValue('pipelineUrl', 'https://ci.example.test/runs/123', 'https://demo.example.test'))
      .toBe('https://ci.example.test/runs/123');
    expect(formatMetadataValue('pipelineId', 'pipeline-123', 'https://demo.example.test')).toBe('pipeline-123');
  });

  it('labels the hosted Pipeline Lab as an external-CI preview', async () => {
    window.history.pushState({}, '', '/pipeline-lab');
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith('/api/demo/config')) {
        return {
          ok: true,
          json: async () => ({
            enabled: true,
            runnerMode: 'hosted-preview',
            externalCiStatus: 'EXTERNAL_CI_INTEGRATION_PENDING'
          })
        } as Response;
      }
      throw new Error(`Unexpected request: ${url}`);
    }));

    render(<App />);
    expect(await screen.findByText(/Official CI is not configured yet/)).toBeTruthy();
    expect(screen.getByText(/without starting Cypress or Playwright/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Preview pipeline flow' })).toBeTruthy();
  });
});
