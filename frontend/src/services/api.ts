const API_BASE = 'http://localhost:8000/api';
const WS_BASE = 'ws://localhost:8000/api';

export async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

export function createWebSocket(): WebSocket {
  return new WebSocket(`${WS_BASE}/ws`);
}
