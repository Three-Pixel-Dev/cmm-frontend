import type { QueryClient } from "@tanstack/react-query";
import {
  MARKET_GROUP_DETAIL_KEY,
  type MarketDetails,
  type MarketItem,
} from "@/hooks/useMarketGroupDetail";
import { MARKETS_CATALOG_KEY } from "@/hooks/useMarkets";
import type { ApiMarketItemOption, ApiMarketPool } from "@/types/market-api";
import type { MarketGroupCard, MarketGroupDetail, MarketItemDetail } from "@/lib/markets/types";
import { participantsFromPool } from "@/lib/markets/map";

type LiveOptionPool = {
  seed_count: number;
  real_count: number;
};

export type LiveOptionSnapshot = {
  id: string;
  sort_order?: number;
  real_pool?: LiveOptionPool;
  virtual_pool?: LiveOptionPool;
};

/** Authoritative real-pool update on channel market.{itemId}.live */
export type MarketLiveSnapshot = {
  eventType: "market.snapshot";
  marketItemId: string;
  pool: ApiMarketPool;
  yesPrice: number;
  seedRetired: boolean;
  options?: LiveOptionSnapshot[];
  lastBet?: {
    betId: string;
    userId: string;
    side: "yes" | "no";
    option_id?: string;
    shares: number;
    amount: number;
  };
};

/** Virtual pool update on channel market.{itemId}.virtual-pool */
export type VirtualPoolUpdate = {
  eventType: "pool.updated";
  marketItemId: string;
  totalYesShares: number;
  totalNoShares: number;
  totalShares: number;
  options?: LiveOptionSnapshot[];
};

export function marketLiveChannel(itemId: string): string {
  return `market.${itemId}.live`;
}

export function marketVirtualPoolChannel(itemId: string): string {
  return `market.${itemId}.virtual-pool`;
}

function parseLiveOptionPool(raw: unknown): LiveOptionPool | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  return {
    seed_count: Number(p.seed_count ?? 0),
    real_count: Number(p.real_count ?? 0),
  };
}

function parseLiveOptions(raw: unknown): LiveOptionSnapshot[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: LiveOptionSnapshot[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    if (typeof o.id !== "string") continue;
    out.push({
      id: o.id,
      sort_order: typeof o.sort_order === "number" ? o.sort_order : undefined,
      real_pool: parseLiveOptionPool(o.real_pool) ?? undefined,
      virtual_pool: parseLiveOptionPool(o.virtual_pool) ?? undefined,
    });
  }
  return out.length > 0 ? out : undefined;
}

export function parseMarketLiveSnapshot(payload: unknown): MarketLiveSnapshot | null {
  let data: unknown = payload;
  if (typeof payload === "string") {
    try {
      data = JSON.parse(payload);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;
  if (obj.eventType !== "market.snapshot" || typeof obj.marketItemId !== "string") {
    return null;
  }

  const poolRaw = obj.pool;
  if (!poolRaw || typeof poolRaw !== "object") return null;
  const p = poolRaw as Record<string, unknown>;

  const pool: ApiMarketPool = {
    seed_retirement_threshold: Number(p.seed_retirement_threshold ?? 0.8),
    seed_yes_count: Number(p.seed_yes_count ?? 0),
    seed_no_count: Number(p.seed_no_count ?? 0),
    real_yes_count: Number(p.real_yes_count ?? 0),
    real_no_count: Number(p.real_no_count ?? 0),
    total_pool: Number(p.total_pool ?? 0),
  };

  return {
    eventType: "market.snapshot",
    marketItemId: obj.marketItemId,
    pool,
    yesPrice: Number(obj.yesPrice ?? 0.5),
    seedRetired: Boolean(obj.seedRetired),
    options: parseLiveOptions(obj.options),
  };
}

export function parseVirtualPoolUpdate(payload: unknown): VirtualPoolUpdate | null {
  let data: unknown = payload;
  if (typeof payload === "string") {
    try {
      data = JSON.parse(payload);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;
  if (obj.eventType !== "pool.updated") return null;

  const marketItemId =
    typeof obj.marketItemId === "string"
      ? obj.marketItemId
      : typeof obj.market_item_id === "string"
        ? obj.market_item_id
        : null;
  if (!marketItemId) return null;

  return {
    eventType: "pool.updated",
    marketItemId,
    totalYesShares: Number(obj.totalYesShares ?? obj.total_yes_shares ?? 0),
    totalNoShares: Number(obj.totalNoShares ?? obj.total_no_shares ?? 0),
    totalShares: Number(obj.totalShares ?? obj.total_shares ?? 0),
    options: parseLiveOptions(obj.options),
  };
}

function isMarketDetails(detail: unknown): detail is MarketDetails {
  return (
    !!detail &&
    typeof detail === "object" &&
    "items" in detail &&
    Array.isArray((detail as MarketDetails).items) &&
    !("group" in detail)
  );
}

function isMarketGroupDetail(detail: unknown): detail is MarketGroupDetail {
  if (!detail || typeof detail !== "object") return false;
  const d = detail as MarketGroupDetail;
  return (
    "group" in d &&
    !!d.group &&
    typeof d.group === "object" &&
    Array.isArray(d.items) &&
    Array.isArray(d.group.items)
  );
}

function isMarketGroupDetailQueryKey(queryKey: readonly unknown[]): boolean {
  return (
    queryKey.length === 2 &&
    queryKey[0] === MARKET_GROUP_DETAIL_KEY &&
    typeof queryKey[1] === "string"
  );
}

function patchItemOptions(
  item: MarketItem,
  options: LiveOptionSnapshot[] | undefined,
  ledger: "real" | "virtual",
): MarketItem {
  if (!options?.length || !item.options?.length) return item;

  const poolById = new Map(
    options.map((o) => [o.id, ledger === "real" ? o.real_pool : o.virtual_pool]),
  );

  const nextOptions: ApiMarketItemOption[] = item.options.map((opt) => {
    const counts = poolById.get(opt.id);
    if (!counts) return opt;
    const pool = { seed_count: counts.seed_count, real_count: counts.real_count };
    return ledger === "real" ? { ...opt, real_pool: pool } : { ...opt, virtual_pool: pool };
  });

  return { ...item, options: nextOptions };
}

/** When WS sends item pool but not per-option pools, keep Yes/No counts in sync. */
function syncBinaryOptionsFromPool(
  item: MarketItem,
  pool: ApiMarketPool,
  ledger: "real" | "virtual",
): MarketItem {
  if (!item.options || item.options.length !== 2) return item;

  const nextOptions: ApiMarketItemOption[] = item.options.map((opt, index) => {
    const counts = {
      seed_count: index === 0 ? pool.seed_yes_count : pool.seed_no_count,
      real_count: index === 0 ? pool.real_yes_count : pool.real_no_count,
    };
    return ledger === "real" ? { ...opt, real_pool: counts } : { ...opt, virtual_pool: counts };
  });

  return { ...item, options: nextOptions };
}

function patchMarketItemRealPool(item: MarketItem, snap: MarketLiveSnapshot): MarketItem {
  if (item.id !== snap.marketItemId) return item;
  const withPool = { ...item, real_pool: snap.pool };
  if (snap.options?.length) {
    return patchItemOptions(withPool, snap.options, "real");
  }
  return syncBinaryOptionsFromPool(withPool, snap.pool, "real");
}

function patchMarketItemVirtualPool(item: MarketItem, update: VirtualPoolUpdate): MarketItem {
  if (item.id !== update.marketItemId) return item;
  const existing = item.virtual_pool;
  const withPool: MarketItem = {
    ...item,
    virtual_pool: {
      seed_retirement_threshold: existing?.seed_retirement_threshold ?? 0.8,
      seed_yes_count: existing?.seed_yes_count ?? 0,
      seed_no_count: existing?.seed_no_count ?? 0,
      real_yes_count: update.totalYesShares,
      real_no_count: update.totalNoShares,
      total_pool: update.totalShares,
    },
  };
  if (update.options?.length) {
    return patchItemOptions(withPool, update.options, "virtual");
  }
  return syncBinaryOptionsFromPool(withPool, withPool.virtual_pool!, "virtual");
}

export function applyLiveSnapshotToMarketDetails(
  detail: MarketDetails,
  snap: MarketLiveSnapshot,
): MarketDetails {
  return {
    ...detail,
    items: detail.items.map((item) => patchMarketItemRealPool(item, snap)),
  };
}

export function applyVirtualPoolToMarketDetails(
  detail: MarketDetails,
  update: VirtualPoolUpdate,
): MarketDetails {
  return {
    ...detail,
    items: detail.items.map((item) => patchMarketItemVirtualPool(item, update)),
  };
}

function patchItemDetail(item: MarketItemDetail, snap: MarketLiveSnapshot): MarketItemDetail {
  if (item.id !== snap.marketItemId) return item;
  return {
    ...item,
    pool: snap.pool,
    yesPrice: snap.yesPrice,
    volume: snap.pool.total_pool,
    participants: participantsFromPool(snap.pool),
  };
}

export function applyLiveSnapshotToDetail(
  detail: MarketGroupDetail,
  snap: MarketLiveSnapshot,
): MarketGroupDetail {
  const items = detail.items.map((item) => patchItemDetail(item, snap));
  const groupItems = detail.group.items.map((row) => {
    if (row.id !== snap.marketItemId) return row;
    return { ...row, yesPrice: snap.yesPrice, volume: snap.pool.total_pool };
  });
  return {
    ...detail,
    items,
    group: {
      ...detail.group,
      items: groupItems,
      totalVolume: groupItems.reduce((sum, i) => sum + i.volume, 0),
    },
  };
}

export function applyLiveSnapshotToCatalog(
  groups: MarketGroupCard[],
  snap: MarketLiveSnapshot,
): MarketGroupCard[] {
  return groups.map((group) => {
    const hasItem = group.items.some((i) => i.id === snap.marketItemId);
    if (!hasItem) return group;

    const items = group.items.map((row) => {
      if (row.id !== snap.marketItemId) return row;
      return { ...row, yesPrice: snap.yesPrice, volume: snap.pool.total_pool };
    });
    return {
      ...group,
      items,
      totalVolume: items.reduce((sum, i) => sum + i.volume, 0),
    };
  });
}

/** Patch React Query market caches from a live snapshot (HTTP bet response or WS event). */
export function applyMarketLiveSnapshotToCache(
  queryClient: QueryClient,
  payload: unknown,
): boolean {
  const snap = parseMarketLiveSnapshot(payload);
  if (!snap) return false;

  queryClient.setQueriesData<MarketDetails | MarketGroupDetail>(
    { predicate: (query) => isMarketGroupDetailQueryKey(query.queryKey) },
    (old) => {
      if (!old) return old;
      if (isMarketDetails(old)) {
        return applyLiveSnapshotToMarketDetails(old, snap);
      }
      if (isMarketGroupDetail(old)) {
        return applyLiveSnapshotToDetail(old, snap);
      }
      return old;
    },
  );

  queryClient.setQueriesData<MarketGroupCard[]>({ queryKey: MARKETS_CATALOG_KEY }, (old) =>
    old ? applyLiveSnapshotToCatalog(old, snap) : old,
  );

  return true;
}

/** Patch detail cache from virtual pool WS event (market.{id}.virtual-pool). */
export function applyVirtualPoolUpdateToCache(queryClient: QueryClient, payload: unknown): boolean {
  const update = parseVirtualPoolUpdate(payload);
  if (!update) return false;

  queryClient.setQueriesData<MarketDetails>(
    { predicate: (query) => isMarketGroupDetailQueryKey(query.queryKey) },
    (old) => (old && isMarketDetails(old) ? applyVirtualPoolToMarketDetails(old, update) : old),
  );

  return true;
}
