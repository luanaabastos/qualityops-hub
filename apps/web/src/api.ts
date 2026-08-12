const API_BASE = 'http://localhost:3001';

export async function fetchDashboard() {
  const response = await fetch(`${API_BASE}/api/dashboard`);
  if (!response.ok) {
    throw new Error('Dashboard request failed');
  }
  return response.json();
}

export async function fetchProducts() {
  const response = await fetch(`${API_BASE}/api/products`);
  if (!response.ok) {
    throw new Error('Products request failed');
  }
  return response.json();
}

export async function fetchProduct(key: string) {
  const response = await fetch(`${API_BASE}/api/products/${key}`);
  if (!response.ok) {
    throw new Error('Product request failed');
  }
  return response.json();
}

export async function fetchExecutions(key: string) {
  const response = await fetch(`${API_BASE}/api/products/${key}/executions`);
  if (!response.ok) {
    throw new Error('Executions request failed');
  }
  return response.json();
}
