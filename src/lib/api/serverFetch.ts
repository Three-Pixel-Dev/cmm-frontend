import type { ApiEnvelope } from "@/lib/api/http";
import type { ApiMarketGroup } from "@/types/market-api";

/** API base for SSR and client. Relative /api/v1 works in browser via Vite proxy. */
export function resolveApiBase(): string {
  const envBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  if (envBase) return `${envBase}/api/v1`;
  if (typeof window !== "undefined") return "/api/v1";
  return "http://localhost:8080/api/v1";
}

export async function fetchMarketGroup(id: string): Promise<ApiMarketGroup | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${resolveApiBase()}/markets/${id}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Failed to fetch market: ${res.status}`);
    }
    const body = (await res.json()) as ApiEnvelope<ApiMarketGroup>;
    return body.data ?? null;
  } finally {
    clearTimeout(timeout);
  }
}
