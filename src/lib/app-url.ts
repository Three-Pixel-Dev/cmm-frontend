/** P2P agent dashboard (separate from customer app). */
export const P2P_ADMIN_URL = (
  import.meta.env.VITE_P2P_ADMIN_URL ?? "http://localhost:5175"
).replace(/\/$/, "");

/** Public customer app URL (HTTPS in production). Used for og:url and fallback og:image. */
export const APP_URL = (import.meta.env.VITE_APP_URL ?? "").replace(/\/$/, "");

/** Site origin for absolute URLs in meta tags. */
export function getSiteUrl(fallbackOrigin?: string): string {
  if (APP_URL) return APP_URL;
  if (fallbackOrigin) return fallbackOrigin.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:5173";
}

/** Public origin for affiliate/share links (uses VITE_APP_URL when set). */
export function getShareOrigin(): string {
  return getSiteUrl();
}

export function buildFacebookSharerUrl(pageUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
}
