import type { DemoMode, ProductKey, SuiteType } from '@qualityops-hub/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function getJson(path: string) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) throw new Error(`${response.status}:${path} request failed`);
  return response.json();
}

export const fetchDashboard = () => getJson('/api/dashboard');
export const fetchProducts = () => getJson('/api/products');
export const fetchProduct = (key: string) => getJson(`/api/products/${key}`);
export const fetchExecutions = (key: string) => getJson(`/api/products/${key}/executions`);
export const fetchExecution = (id: string) => getJson(`/api/executions/${id}`);
export const fetchDemoRun = (id: string) => getJson(`/api/demo/runs/${id}`);

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
  if (!response.ok) throw new Error('Demo run request failed');
  return response.json();
}
