import type { DemoMode, ProductKey, SuiteType } from '@qualityops-hub/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '');
const requestTimeoutMs = 10_000;

export class ApiRequestError extends Error {
  constructor(readonly status: number, path: string) {
    super(`${status}:${path} request failed`);
    this.name = 'ApiRequestError';
  }
}

async function getJson(path: string, signal?: AbortSignal) {
  const controller = new AbortController();
  const relayAbort = () => controller.abort();
  signal?.addEventListener('abort', relayAbort, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(`${API_BASE}${path}`, { signal: controller.signal });
    if (!response.ok) throw new ApiRequestError(response.status, path);
    return response.json();
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', relayAbort);
  }
}

export const fetchDashboard = () => getJson('/api/dashboard');
export const fetchProducts = () => getJson('/api/products');
export const fetchProduct = (key: string) => getJson(`/api/products/${key}`);
export const fetchExecutions = (key: string) => getJson(`/api/products/${key}/executions`);
export const fetchExecution = (id: string, signal?: AbortSignal) => getJson(`/api/executions/${id}`, signal);
export const fetchDemoRun = (id: string, signal?: AbortSignal) => getJson(`/api/demo/runs/${id}`, signal);
export const fetchDemoConfig = (signal?: AbortSignal) => getJson('/api/demo/config', signal);
export const fetchReadiness = () => getJson('/api/readiness');

export async function fetchAllExecutions(keys: string[]) {
  const responses = await Promise.all(keys.map((key) => fetchExecutions(key)));
  return responses.flatMap((payload) => payload.executions);
}

export async function createDemoRun(input: { product: ProductKey; suite: SuiteType; mode: DemoMode }) {
  const response = await fetch(`${API_BASE}/api/demo/runs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Demo run request failed.' })) as { error?: string };
    throw new Error(payload.error ?? 'Demo run request failed.');
  }
  return response.json();
}
