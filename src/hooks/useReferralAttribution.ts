import { useEffect, useRef } from "react";
import { referralApi } from "@/lib/api/referral";
import { getShareOrigin } from "@/lib/app-url";

/** Legacy single-key storage (migrated to per-market keys on read). */
const LEGACY_STORAGE_KEY = "cmm_ref";
const storageKeyForMarket = (marketId: string) => `cmm_ref:${marketId}`;
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type StoredReferralAttribution = {
  code: string;
  market_id: string;
  affiliate_rate_percent: number;
  referrer_user_id: string;
  stored_at: number;
};

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function isExpired(storedAt: number): boolean {
  return Date.now() - storedAt > TTL_MS;
}

function parseStored(raw: string | null): StoredReferralAttribution | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredReferralAttribution;
    if (!parsed?.code || !parsed?.market_id || !parsed.stored_at) return null;
    if (isExpired(parsed.stored_at)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readLegacy(): StoredReferralAttribution | null {
  const parsed = parseStored(localStorage.getItem(LEGACY_STORAGE_KEY));
  if (!parsed) {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return null;
  }
  if (isExpired(parsed.stored_at)) {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return null;
  }
  localStorage.setItem(storageKeyForMarket(parsed.market_id), JSON.stringify(parsed));
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  return parsed;
}

function readForMarket(marketId: string): StoredReferralAttribution | null {
  const stored = parseStored(localStorage.getItem(storageKeyForMarket(marketId)));
  if (stored) {
    if (isExpired(stored.stored_at)) {
      localStorage.removeItem(storageKeyForMarket(marketId));
      return null;
    }
    return stored;
  }

  const legacy = readLegacy();
  if (legacy?.market_id === marketId) {
    return legacy;
  }
  return null;
}

/** Read ?ref= from the address bar (before it is stripped after click tracking). */
export function getReferralCodeFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const ref = new URLSearchParams(window.location.search).get("ref");
  if (!ref) return undefined;
  const code = normalizeCode(ref);
  return code.length === 8 ? code : undefined;
}

export function getStoredReferralAttribution(marketId?: string): StoredReferralAttribution | null {
  if (marketId) {
    return readForMarket(marketId);
  }
  return readLegacy();
}

export function storeReferralAttribution(payload: Omit<StoredReferralAttribution, "stored_at">) {
  const next: StoredReferralAttribution = {
    ...payload,
    code: normalizeCode(payload.code),
    stored_at: Date.now(),
  };
  localStorage.setItem(storageKeyForMarket(payload.market_id), JSON.stringify(next));
}

/** Code to attach on the next bet for this market (storage, then URL fallback). */
export function getReferralCodeForBet(marketId: string): string | undefined {
  const stored = readForMarket(marketId)?.code;
  if (stored) return stored;
  return getReferralCodeFromUrl();
}

export function buildGuestShareUrl(marketId: string): string {
  return `${getShareOrigin()}/markets/${marketId}`;
}

export function buildReferralShareUrl(marketId: string, code: string): string {
  return `${getShareOrigin()}/markets/${marketId}?ref=${encodeURIComponent(code)}`;
}

export function useReferralCapture(marketId: string, ref?: string) {
  const captured = useRef(false);

  useEffect(() => {
    const code = ref?.trim();
    if (!code || !marketId || captured.current) return;
    captured.current = true;

    const normalized = normalizeCode(code);

    // Store immediately so a fast bet after landing still sends referral_code
    // (recordClick is async; previously the bet often won the race).
    storeReferralAttribution({
      code: normalized,
      market_id: marketId,
      affiliate_rate_percent: readForMarket(marketId)?.affiliate_rate_percent ?? 0,
      referrer_user_id: readForMarket(marketId)?.referrer_user_id ?? "",
    });

    referralApi
      .recordClick({ code: normalized, market_id: marketId })
      .then((data) => {
        if (data && !("skipped" in data)) {
          storeReferralAttribution({
            code: data.code,
            market_id: data.market_id,
            affiliate_rate_percent: data.affiliate_rate_percent,
            referrer_user_id: data.referrer_user_id,
          });
        }
        const url = new URL(window.location.href);
        if (url.searchParams.has("ref")) {
          url.searchParams.delete("ref");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
      })
      .catch(() => {
        captured.current = false;
      });
  }, [marketId, ref]);
}
