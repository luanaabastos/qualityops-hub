import { randomBytes } from 'node:crypto';

export type RuntimeConfig = {
  production: boolean;
  host: string;
  port: number;
  serveWeb: boolean;
  demoEnabled: boolean;
  apiBaseUrl: string;
  publicAppUrl: string;
  demoSystemToken: string;
  allowedOrigins: string[];
  demoRunTimeoutMs: number;
  demoMaxConcurrentRuns: number;
  demoRateLimitMax: number;
  demoRateLimitWindowMs: number;
  demoRunCooldownMs: number;
};

export class RuntimeConfigError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'RuntimeConfigError';
  }
}

function integer(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

function normalizedUrl(name: string, value: string): string {
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
    return parsed.toString().replace(/\/$/, '');
  } catch {
    throw new RuntimeConfigError(`${name}_INVALID`, `${name} must be an absolute HTTP(S) URL.`);
  }
}

export function loadRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
  overrides: Partial<RuntimeConfig> = {}
): RuntimeConfig {
  const production = overrides.production ?? env.NODE_ENV === 'production';
  const demoEnabled = overrides.demoEnabled ?? env.DEMO_PIPELINE_LAB_ENABLED === 'true';
  const serveWeb = overrides.serveWeb ?? production;
  const configuredPublicAppUrl = overrides.publicAppUrl ?? env.PUBLIC_APP_URL;
  if (production && !configuredPublicAppUrl) {
    throw new RuntimeConfigError('PUBLIC_APP_URL_REQUIRED', 'PUBLIC_APP_URL is required in production.');
  }
  const publicAppUrl = overrides.publicAppUrl ?? normalizedUrl(
    'PUBLIC_APP_URL',
    configuredPublicAppUrl ?? 'http://127.0.0.1:5173'
  );
  const apiBaseUrl = overrides.apiBaseUrl ?? normalizedUrl(
    'API_BASE_URL',
    env.API_BASE_URL ?? (production ? publicAppUrl : 'http://127.0.0.1:3001')
  );
  const configuredSystemToken = overrides.demoSystemToken ?? env.DEMO_SYSTEM_TOKEN;
  if (production && demoEnabled && (!configuredSystemToken || configuredSystemToken.length < 32)) {
    throw new RuntimeConfigError(
      'DEMO_SYSTEM_TOKEN_INVALID',
      'DEMO_SYSTEM_TOKEN must contain at least 32 characters when the hosted Pipeline Lab is enabled.'
    );
  }
  const defaultOrigins = production ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173'];
  const configuredOrigins = env.QUALITYOPS_ALLOWED_ORIGINS
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    production,
    host: overrides.host ?? env.HOST ?? '0.0.0.0',
    port: overrides.port ?? integer(env.PORT, 3001, 1, 65_535),
    serveWeb,
    demoEnabled,
    apiBaseUrl,
    publicAppUrl,
    demoSystemToken: configuredSystemToken ?? randomBytes(32).toString('base64url'),
    allowedOrigins: overrides.allowedOrigins ?? configuredOrigins ?? defaultOrigins,
    demoRunTimeoutMs: overrides.demoRunTimeoutMs ?? integer(env.DEMO_RUN_TIMEOUT_MS, 120_000, 5_000, 600_000),
    demoMaxConcurrentRuns: overrides.demoMaxConcurrentRuns ?? integer(env.DEMO_MAX_CONCURRENT_RUNS, 2, 1, 8),
    demoRateLimitMax: overrides.demoRateLimitMax ?? integer(env.DEMO_RATE_LIMIT_MAX, 4, 1, 100),
    demoRateLimitWindowMs: overrides.demoRateLimitWindowMs ?? integer(env.DEMO_RATE_LIMIT_WINDOW_MS, 60_000, 1_000, 3_600_000),
    demoRunCooldownMs: overrides.demoRunCooldownMs ?? integer(env.DEMO_RUN_COOLDOWN_MS, 10_000, 0, 600_000)
  };
}
