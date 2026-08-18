import { describe, expect, it } from 'vitest';
import { loadRuntimeConfig, RuntimeConfigError } from './config.js';
import { Database } from './database.js';
import { startupFailureLogLine } from './server.js';

describe('hosted runtime configuration', () => {
  it('requires explicit public URLs and a strong system token in production', () => {
    expect(() => loadRuntimeConfig({ NODE_ENV: 'production' })).toThrow('PUBLIC_APP_URL is required in production.');
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
    expect(config.host).toBe('0.0.0.0');
    expect(config.port).toBe(4321);
    expect(config.serveWeb).toBe(true);
  });

  it('uses an explicit external host and provider port', () => {
    const config = loadRuntimeConfig({
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: '10000',
      PUBLIC_APP_URL: 'https://qualityops.example',
      DEMO_PIPELINE_LAB_ENABLED: 'false'
    });
    expect(config.host).toBe('0.0.0.0');
    expect(config.port).toBe(10000);
  });

  it('rejects invalid public and API URLs before startup', () => {
    expect(() => loadRuntimeConfig({
      NODE_ENV: 'production',
      PUBLIC_APP_URL: 'not-a-url'
    })).toThrow('PUBLIC_APP_URL must be an absolute HTTP(S) URL.');
    expect(() => loadRuntimeConfig({
      NODE_ENV: 'production',
      PUBLIC_APP_URL: 'https://qualityops.example',
      API_BASE_URL: 'file:///tmp/api'
    })).toThrow('API_BASE_URL must be an absolute HTTP(S) URL.');
  });

  it('logs config failures with phase and code while suppressing arbitrary messages', () => {
    const configLog = JSON.parse(startupFailureLogLine(
      new RuntimeConfigError('PUBLIC_APP_URL_REQUIRED', 'PUBLIC_APP_URL is required in production.'),
      'config_validation'
    ));
    expect(configLog).toEqual({
      event: 'server_start_failed',
      phase: 'config_validation',
      errorName: 'RuntimeConfigError',
      errorCode: 'PUBLIC_APP_URL_REQUIRED',
      message: 'PUBLIC_APP_URL is required in production.'
    });

    const sensitiveMessage = 'sensitive-runtime-value-must-not-be-logged';
    const dependencyError = Object.assign(new Error(sensitiveMessage), { code: 'ECONNREFUSED' });
    const dependencyLog = startupFailureLogLine(dependencyError, 'application_build');
    expect(dependencyLog).not.toContain(sensitiveMessage);
    expect(JSON.parse(dependencyLog)).toMatchObject({
      phase: 'application_build',
      errorCode: 'ECONNREFUSED',
      message: 'A required dependency refused the connection.'
    });
  });

  it('keeps certificate verification enabled for remote PostgreSQL TLS', async () => {
    const database = new Database('postgresql://user:password@database.example/db?sslmode=require');
    expect((database.pool as unknown as { options: { ssl: unknown } }).options.ssl)
      .toEqual({ rejectUnauthorized: true });
    await database.close();
  });
});
