import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuth } from "@/store/useAuth";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    _skipAuthRefresh?: boolean;
  }
}

/** Empty string uses the Vite dev proxy (/api → gateway). Set VITE_API_BASE_URL for direct gateway access. */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export const http = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

let refreshPromise: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  await http.post<ApiEnvelope<unknown>>("/auth/refresh", {}, { _skipAuthRefresh: true });
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const original = error.config;
    const data = error.response?.data;
    const message =
      data?.error ||
      data?.message ||
      (error.code === "ERR_NETWORK"
        ? `Cannot reach the API${API_BASE ? ` at ${API_BASE}` : ""}. Is the gateway running?`
        : error.message) ||
      "Request failed";

    if (!original || original._skipAuthRefresh || error.response?.status !== 401) {
      return Promise.reject(new Error(message));
    }

    const url = original.url ?? "";
    if (
      url.includes("/auth/login") ||
      url.includes("/auth/admin/code-login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/logout")
    ) {
      useAuth.getState().clearSession();
      return Promise.reject(new Error(message));
    }

    try {
      if (!refreshPromise) {
        refreshPromise = refreshSession().finally(() => {
          refreshPromise = null;
        });
      }
      await refreshPromise;
      return http(original);
    } catch {
      useAuth.getState().clearSession();
      return Promise.reject(new Error(message));
    }
  },
);

export function unwrap<T>(envelope: ApiEnvelope<T>): T {
  return envelope.data as T;
}
