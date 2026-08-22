import { API_BASE } from "./http";

/** Cookies carry the JWT; no token query param needed when using the dev proxy or same-site cookies. */
export function gatewayWebSocketUrl(): string {
  if (typeof window !== "undefined" && !API_BASE) {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}/ws`;
  }

  const apiBase = API_BASE || "http://localhost:8080";
  const wsBase = apiBase.replace(/^http/i, (scheme: string) =>
    scheme.toLowerCase() === "https" ? "wss" : "ws",
  );
  return `${wsBase}/ws`;
}

export type WsServerMessage =
  | { type: "hello" }
  | { type: "heartbeat" }
  | { type: "subscribed"; channel: string }
  | { type: "unsubscribed"; channel: string }
  | { type: "error"; message?: string }
  | { type: "event"; channel: string; payload: unknown };

export function parseWsMessage(raw: string): WsServerMessage | null {
  try {
    return JSON.parse(raw) as WsServerMessage;
  } catch {
    return null;
  }
}
