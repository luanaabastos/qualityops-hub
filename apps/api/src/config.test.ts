import { describe, expect, it } from 'vitest';
import { loadRuntimeConfig } from './config.js';

describe('hosted runtime configuration', () => {
  it('requires explicit public URLs and a strong system token in production', () => {
    expect(() => loadRuntimeConfig({ NODE_ENV: 'production' })).toThrow('PUBLIC_APP_URL');
    expect(() => loadRuntimeConfig({
      NODE_ENV: 'production',
      PUBLIC_APP_URL: 'https://qualityops.example',
      DEMO_PIPELINE_LAB_ENABLED: 'true',
      DEMO_SYSTEM_TOKEN: 'too-short'
    })).toThrow('DEMO_SYSTEM_TOKEN');
  });

  it('uses same-origin API and no production CORS origins by default', () => {
    const config = loadRuntimeConfig({
      NODE_ENV: 'production',
      PUBLIC_APP_URL: 'https://qualityops.example',
      DEMO_PIPELINE_LAB_ENABLED: 'true',
      DEMO_SYSTEM_TOKEN: 'a'.repeat(32),
      PORT: '4321'
    });
    expect(config.apiBaseUrl).toBe('https://qualityops.example');
    expect(config.allowedOrigins).toEqual([]);
    expect(config.port).toBe(4321);
    expect(config.serveWeb).toBe(true);
  });
});
