// lib/api.ts
import type { CycleRecord, HealthResponse, WorldState } from "./types";

const BASE =
  (typeof window === "undefined"
    ? process.env.BACKEND_URL
    : process.env.NEXT_PUBLIC_BACKEND_URL
  )?.replace(/\/$/, "") ?? "http://localhost:3001";

async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  getLatest:  () => get<CycleRecord>("/api/latest"),
  getHealth:  () => get<HealthResponse>("/api/health"),
  getHistory: (limit = 20) => get<CycleRecord[]>(`/api/history?limit=${limit}`),
  getSnapshot: () => get<WorldState>("/api/snapshot"),
  trigger: (apiKey: string) =>
    post<{ accepted: boolean; message?: string; reason?: string }>(
      "/api/trigger",
      { "x-api-key": apiKey },
    ),
};
