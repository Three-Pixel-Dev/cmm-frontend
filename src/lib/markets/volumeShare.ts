import type { MarketItem } from "@/hooks/useMarketGroupDetail";
import { getItemAnswerOptions } from "@/lib/markets/marketItemOptions";
import { leadingOptionPercent, optionImpliedPercent, realPoolMoney } from "@/lib/markets/optionPricing";

export type VolumeLedger = "real" | "virtual";
export type VolumeHistoryRange = "5MIN" | "15MIN" | "1H" | "6H" | "1D" | "1W" | "1M" | "ALL";
export type VolumeRange = "LIVE" | VolumeHistoryRange;

export function isLiveVolumeRange(range: VolumeRange): range is "LIVE" {
  return range === "LIVE";
}

export function isHistoricalVolumeRange(range: VolumeRange): range is VolumeHistoryRange {
  return range !== "LIVE";
}

export type VolumeHistoryPoint = {
  t: string;
  pct: number;
};

export type VolumeHistorySeries = {
  market_item_id: string;
  title_en: string;
  title_my: string;
  current_pct: number;
  points: VolumeHistoryPoint[];
};

export type VolumeHistoryResponse = {
  market_id: string;
  ledger: VolumeLedger;
  range: VolumeHistoryRange;
  total_volume: number;
  series: VolumeHistorySeries[];
};

export type VolumeChartRow = {
  t: number;
  [itemId: string]: number;
};

export type ChartLineDef = {
  key: string;
  itemId: string;
  label: string;
  color: string;
};

function coercePct(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return 0;
  }
  if (n > 0 && n <= 1) {
    return n * 100;
  }
  return n;
}

/** Rolling window shown in Live mode. */
export const LIVE_CHART_WINDOW_MS = 15 * 60 * 1000;

const HISTORICAL_RANGE_MS: Record<VolumeHistoryRange, number | null> = {
  "5MIN": 5 * 60 * 1000,
  "15MIN": 15 * 60 * 1000,
  "1H": 60 * 60 * 1000,
  "6H": 6 * 60 * 60 * 1000,
  "1D": 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
  ALL: null,
};

function rangeWindowMs(range: VolumeRange): number | null {
  if (isLiveVolumeRange(range)) {
    return LIVE_CHART_WINDOW_MS;
  }
  return HISTORICAL_RANGE_MS[range];
}

export function poolTotalForItem(item: MarketItem, ledger: VolumeLedger): number {
  const pool = ledger === "real" ? item.real_pool : item.virtual_pool;
  const answerOptions = getItemAnswerOptions(item, ledger, "en");
  return realPoolMoney(answerOptions, pool ?? null, item.one_share_price);
}

export function poolYesNoCounts(item: MarketItem, ledger: VolumeLedger): { yes: number; no: number } {
  const pool = ledger === "real" ? item.real_pool : item.virtual_pool;
  if (!pool) {
    return { yes: 0, no: 0 };
  }
  return {
    yes: pool.real_yes_count + pool.seed_yes_count,
    no: pool.real_no_count + pool.seed_no_count,
  };
}

export function computeItemYesChance(item: MarketItem, ledger: VolumeLedger): number {
  const pool = ledger === "real" ? item.real_pool : item.virtual_pool;
  const answerOptions = getItemAnswerOptions(item, ledger, "en");

  if (item.options && item.options.length > 2) {
    const leading = leadingOptionPercent(answerOptions, pool ?? null);
    return leading?.pct ?? 0;
  }

  if (item.options && item.options.length === 2 && answerOptions.length >= 2) {
    return optionImpliedPercent(answerOptions[0], answerOptions, pool ?? null);
  }

  const { yes, no } = poolYesNoCounts(item, ledger);
  const total = yes + no;
  if (total <= 0) {
    return 0;
  }
  return (yes / total) * 100;
}

export function computeGroupVolumeShares(
  items: MarketItem[],
  ledger: VolumeLedger,
): Map<string, number> {
  const shares = new Map<string, number>();
  for (const item of items) {
    shares.set(item.id, computeItemYesChance(item, ledger));
  }
  return shares;
}

export function computeGroupTotalVolume(items: MarketItem[], ledger: VolumeLedger): number {
  return items.reduce((sum, item) => sum + poolTotalForItem(item, ledger), 0);
}

export function volumeHistoryToChartRows(series: VolumeHistorySeries[]): VolumeChartRow[] {
  const byTime = new Map<number, VolumeChartRow>();

  for (const item of series) {
    for (const point of item.points) {
      const t = new Date(point.t).getTime();
      const row = byTime.get(t) ?? { t };
      row[item.market_item_id] = coercePct(point.pct);
      byTime.set(t, row);
    }
  }

  return Array.from(byTime.values()).sort((a, b) => a.t - b.t);
}

export function isLegacyEqualSplitHistory(rows: VolumeChartRow[], itemIds: string[]): boolean {
  if (rows.length === 0 || itemIds.length < 2) {
    return false;
  }

  return rows.every((row) => {
    const values = itemIds
      .map((id) => row[id])
      .filter((value): value is number => typeof value === "number");
    if (values.length < 2) {
      return false;
    }
    return values.every((value) => Math.abs(value - values[0]) < 0.5);
  });
}

export function shouldDiscardVolumeHistory(
  rows: VolumeChartRow[],
  items: MarketItem[],
  ledger: VolumeLedger,
): boolean {
  if (!isLegacyEqualSplitHistory(rows, items.map((item) => item.id))) {
    return false;
  }

  return items.some((item) => Math.abs(computeItemYesChance(item, ledger) - 50) > 5);
}

export function buildLiveVolumePoint(
  items: MarketItem[],
  ledger: VolumeLedger,
  at = Date.now(),
): VolumeChartRow {
  const shares = computeGroupVolumeShares(items, ledger);
  const row: VolumeChartRow = { t: at };
  for (const [itemId, pct] of shares) {
    row[itemId] = pct;
  }
  return row;
}

/** End of the chart window: Live rolls with now; historical anchors on last snapshot. */
export function volumeChartRangeEnd(rows: VolumeChartRow[], range: VolumeRange): number {
  if (isLiveVolumeRange(range)) {
    return Date.now();
  }
  if (rows.length === 0) {
    return Date.now();
  }
  return rows.reduce((max, row) => Math.max(max, row.t), 0);
}

export function volumeChartTimeDomain(
  rows: VolumeChartRow[],
  range: VolumeRange,
): [number, number] | null {
  if (isLiveVolumeRange(range) || rows.length === 0) {
    return null;
  }
  const windowMs = HISTORICAL_RANGE_MS[range];
  if (windowMs == null) {
    return null;
  }
  const end = volumeChartRangeEnd(rows, range);
  return [end - windowMs, end];
}

export function trimVolumeChartToRange(rows: VolumeChartRow[], range: VolumeRange): VolumeChartRow[] {
  const windowMs = rangeWindowMs(range);
  if (windowMs == null) {
    return rows;
  }
  const end = volumeChartRangeEnd(rows, range);
  const cutoff = end - windowMs;
  return rows.filter((row) => row.t >= cutoff && row.t <= end + 1_000);
}

/** Build chart rows from API snapshots only (no live pool overlay). */
export function buildHistoricalChartRows(
  baseRows: VolumeChartRow[],
  range: VolumeHistoryRange,
  itemIds: string[],
): VolumeChartRow[] {
  if (baseRows.length === 0 || itemIds.length === 0) {
    return [];
  }

  const filled = forwardFillVolumeRows(mergeVolumeRowsForRange(baseRows, itemIds, range), itemIds);
  const trimmed = trimVolumeChartToRange(filled, range);
  if (trimmed.length >= 2) {
    return trimmed;
  }
  if (trimmed.length === 1) {
    const point = trimmed[0];
    const windowMs = HISTORICAL_RANGE_MS[range];
    const end = point.t;
    let anchorT = windowMs != null ? end - windowMs : end - 24 * 60 * 60 * 1000;
    if (anchorT >= end) {
      anchorT = end - 60_000;
    }
    const anchor: VolumeChartRow = { t: anchorT };
    for (const id of itemIds) {
      const value = point[id];
      if (typeof value === "number") {
        anchor[id] = value;
      }
    }
    return [anchor, point];
  }
  return trimmed;
}

export function shouldWidenVolumeHistoryFetch(
  range: VolumeHistoryRange,
  rows: VolumeChartRow[],
): boolean {
  if (range !== "5MIN" && range !== "15MIN") {
    return false;
  }
  return rows.length < 2;
}

export function widenVolumeHistoryRange(range: VolumeHistoryRange): VolumeHistoryRange {
  if (range === "5MIN") {
    return "1H";
  }
  if (range === "15MIN") {
    return "6H";
  }
  return range;
}

/** True when persisted history has no visible slope (common with stale/duplicate snapshots). */
export function isFlatVolumeHistory(rows: VolumeChartRow[], itemIds: string[], tolerance = 1.5): boolean {
  if (rows.length < 2 || itemIds.length === 0) {
    return false;
  }
  let min = Infinity;
  let max = -Infinity;
  for (const row of rows) {
    for (const id of itemIds) {
      const value = row[id];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        continue;
      }
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }
  if (!Number.isFinite(min)) {
    return false;
  }
  return max - min < tolerance;
}

export function buildFallbackChartRows(
  items: MarketItem[],
  ledger: VolumeLedger,
  range: VolumeRange,
  historyRows: VolumeChartRow[] = [],
): VolumeChartRow[] {
  const windowMs = rangeWindowMs(range);
  const end = volumeChartRangeEnd(historyRows, range);
  const earliestStart = items.reduce((min, item) => {
    const start = new Date(item.start_time).getTime();
    return Number.isFinite(start) ? Math.min(min, start) : min;
  }, end);
  const rangeStart = windowMs != null ? end - windowMs : earliestStart;
  const anchorAt = Math.min(rangeStart, end - 60_000);

  const latest = buildLiveVolumePoint(items, ledger, end);
  const anchor: VolumeChartRow = { t: anchorAt };
  const historyAnchor = historyRows.length > 0 ? historyRows[0] : null;
  for (const [itemId, pct] of computeGroupVolumeShares(items, ledger)) {
    const fromHistory =
      historyAnchor && typeof historyAnchor[itemId] === "number"
        ? historyAnchor[itemId]
        : undefined;
    anchor[itemId] = fromHistory ?? pct;
    latest[itemId] = pct;
  }

  if (historyRows.length >= 2) {
    return [...historyRows, latest].sort((a, b) => a.t - b.t);
  }
  return [anchor, latest];
}

export function padChartRowsForLineDisplay(
  rows: VolumeChartRow[],
  range: VolumeRange,
  itemIds: string[],
): VolumeChartRow[] {
  if (rows.length === 0) {
    return rows;
  }

  const sorted = [...rows].sort((a, b) => a.t - b.t);
  if (sorted.length >= 2) {
    return sorted;
  }

  const latest = sorted[0];
  const windowMs = rangeWindowMs(range);
  const end = volumeChartRangeEnd(sorted, range);
  let anchorT = windowMs != null ? end - windowMs : latest.t - 24 * 60 * 60 * 1000;
  if (anchorT >= latest.t) {
    anchorT = latest.t - 60_000;
  }

  const anchor: VolumeChartRow = { t: anchorT };
  for (const id of itemIds) {
    const value = latest[id];
    if (typeof value === "number") {
      anchor[id] = value;
    }
  }

  return [anchor, latest];
}

export function buildChartLines(
  items: MarketItem[],
  series: VolumeHistorySeries[],
  lang: "en" | "my",
): ChartLineDef[] {
  return items.map((item, index) => ({
    key: `s${index}`,
    itemId: item.id,
    label: item.title[lang],
    color: VOLUME_CHART_COLORS[index % VOLUME_CHART_COLORS.length],
  }));
}

export function mergeVolumeRowsBySecond(rows: VolumeChartRow[], itemIds: string[]): VolumeChartRow[] {
  const bySecond = new Map<number, VolumeChartRow>();

  for (const row of rows) {
    const bucket = Math.floor(row.t / 1000) * 1000;
    const merged = bySecond.get(bucket) ?? { t: bucket };
    for (const id of itemIds) {
      const value = row[id];
      if (typeof value === "number" && Number.isFinite(value)) {
        merged[id] = value;
      }
    }
    bySecond.set(bucket, merged);
  }

  return Array.from(bySecond.values()).sort((a, b) => a.t - b.t);
}

export function forwardFillVolumeRows(rows: VolumeChartRow[], itemIds: string[]): VolumeChartRow[] {
  const last: Record<string, number> = {};

  return rows.map((row) => {
    const next: VolumeChartRow = { t: row.t };
    for (const id of itemIds) {
      const value = row[id];
      if (typeof value === "number" && Number.isFinite(value)) {
        last[id] = value;
        next[id] = value;
      } else if (last[id] !== undefined) {
        next[id] = last[id];
      }
    }
    return next;
  });
}

export function mergeVolumeRowsByDay(rows: VolumeChartRow[], itemIds: string[]): VolumeChartRow[] {
  const byDay = new Map<number, VolumeChartRow>();

  for (const row of rows) {
    const d = new Date(row.t);
    const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0);
    const merged = byDay.get(dayStart) ?? { t: dayStart };
    for (const id of itemIds) {
      const value = row[id];
      if (typeof value === "number" && Number.isFinite(value)) {
        merged[id] = value;
      }
    }
    byDay.set(dayStart, merged);
  }

  return Array.from(byDay.values()).sort((a, b) => a.t - b.t);
}

export function mergeVolumeRowsForRange(
  rows: VolumeChartRow[],
  itemIds: string[],
  range: VolumeRange,
): VolumeChartRow[] {
  if (range === "1M" || range === "ALL") {
    return mergeVolumeRowsByDay(rows, itemIds);
  }
  return mergeVolumeRowsBySecond(rows, itemIds);
}

export function buildLiveChartRows(
  liveRows: VolumeChartRow[],
  itemIds: string[],
): VolumeChartRow[] {
  if (liveRows.length === 0) {
    return [];
  }
  const merged = mergeVolumeRowsForRange(liveRows, itemIds, "LIVE");
  const trimmed = trimVolumeChartToRange(merged, "LIVE");
  return padChartRowsForLineDisplay(trimmed, "LIVE", itemIds);
}

export function projectVolumeRowsForChart(
  rows: VolumeChartRow[],
  lines: ChartLineDef[],
  range: VolumeRange = "1M",
): Array<{ t: number } & Record<string, number>> {
  const itemIds = lines.map((line) => line.itemId);
  const normalized = forwardFillVolumeRows(mergeVolumeRowsForRange(rows, itemIds, range), itemIds);

  return normalized.map((row) => {
    const projected: { t: number } & Record<string, number> = { t: row.t };
    for (const line of lines) {
      const value = row[line.itemId];
      if (typeof value === "number" && Number.isFinite(value)) {
        projected[line.key] = value;
      }
    }
    return projected;
  });
}

function chartItemIds(history: VolumeChartRow[], livePoint: VolumeChartRow | null): string[] {
  const ids = new Set<string>();
  for (const row of history) {
    for (const key of Object.keys(row)) {
      if (key !== "t") ids.add(key);
    }
  }
  if (livePoint) {
    for (const key of Object.keys(livePoint)) {
      if (key !== "t") ids.add(key);
    }
  }
  return Array.from(ids);
}

export function volumeBucketTimestamp(t: number, range: VolumeRange): number {
  if (range === "1M" || range === "ALL") {
    const d = new Date(t);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0);
  }
  return Math.floor(t / 1000) * 1000;
}

const MAX_LIVE_TRAIL_POINTS = 400;

/** Live trail buckets are always second-level; range bucketing happens only at merge/display. */
function liveTrailBucketTimestamp(t: number): number {
  return Math.floor(t / 1000) * 1000;
}

/** Append a live sample to the in-memory trail (Polymarket-style: past points stay fixed). */
export function appendLiveVolumePoint(
  trail: VolumeChartRow[],
  point: VolumeChartRow,
  _range: VolumeRange,
  itemIds: string[],
): VolumeChartRow[] {
  if (itemIds.length === 0) {
    return trail.length > 0 ? trail : [point];
  }

  let next: VolumeChartRow[];
  if (trail.length === 0) {
    next = [point];
  } else {
    const bucket = liveTrailBucketTimestamp(point.t);
    const lastBucket = liveTrailBucketTimestamp(trail[trail.length - 1].t);
    if (bucket === lastBucket) {
      next = [...trail.slice(0, -1), point];
    } else {
      next = [...trail, point];
    }
  }

  if (next.length > MAX_LIVE_TRAIL_POINTS) {
    next = next.slice(next.length - MAX_LIVE_TRAIL_POINTS);
  }
  return next;
}

/** Drop live trail points already persisted in API history (same bucket + value). */
export function trimLiveTrailCoveredByHistory(
  trail: VolumeChartRow[],
  history: VolumeChartRow[],
  range: VolumeRange,
  itemIds: string[],
): VolumeChartRow[] {
  if (trail.length === 0 || history.length === 0) {
    return trail;
  }

  const histMerged = mergeVolumeRowsForRange(history, itemIds, range);
  const histByBucket = new Map<number, VolumeChartRow>();
  for (const row of histMerged) {
    histByBucket.set(volumeBucketTimestamp(row.t, range), row);
  }

  return trail.filter((row) => {
    const histRow = histByBucket.get(volumeBucketTimestamp(row.t, range));
    if (!histRow) {
      return true;
    }
    return itemIds.some((id) => {
      const liveVal = row[id];
      const histVal = histRow[id];
      return (
        typeof liveVal === "number" &&
        typeof histVal === "number" &&
        Math.abs(liveVal - histVal) >= 0.1
      );
    });
  });
}

export function mergeVolumeHistoryWithLivePoint(
  history: VolumeChartRow[],
  livePoint: VolumeChartRow | null,
  range: VolumeRange,
  itemIds?: string[],
): VolumeChartRow[] {
  if (!livePoint) {
    return trimVolumeChartToRange([...history], range);
  }
  return mergeVolumeHistoryWithLivePoints(history, [livePoint], range, itemIds);
}

/** Merge persisted history with the full live trail (not just the latest head). */
export function mergeVolumeHistoryWithLivePoints(
  history: VolumeChartRow[],
  livePoints: VolumeChartRow[],
  range: VolumeRange,
  itemIds?: string[],
): VolumeChartRow[] {
  const ids =
    itemIds ??
    chartItemIds(history, livePoints.length > 0 ? livePoints[livePoints.length - 1] : null);
  if (livePoints.length === 0) {
    return trimVolumeChartToRange([...history], range);
  }
  const merged = mergeVolumeRowsForRange([...history, ...livePoints], ids, range);
  return trimVolumeChartToRange(merged, range);
}

/** True when persisted history already reflects the live tail for this range bucket. */
export function isLivePointCoveredByHistory(
  history: VolumeChartRow[],
  livePoint: VolumeChartRow,
  range: VolumeRange,
  itemIds: string[],
): boolean {
  if (history.length === 0 || itemIds.length === 0) {
    return false;
  }
  const withLive = mergeVolumeRowsForRange([...history, livePoint], itemIds, range);
  const histOnly = mergeVolumeRowsForRange(history, itemIds, range);
  if (withLive.length !== histOnly.length) {
    return false;
  }
  const lastWithLive = withLive[withLive.length - 1];
  const lastHist = histOnly[histOnly.length - 1];
  if (lastWithLive.t !== lastHist.t) {
    return false;
  }
  return itemIds.every((id) => {
    const a = lastWithLive[id];
    const b = lastHist[id];
    return typeof a === "number" && typeof b === "number" && Math.abs(a - b) < 0.1;
  });
}

export function poolsSignature(items: MarketItem[], ledger: VolumeLedger): string {
  return items
    .map((item) => {
      const pool = ledger === "real" ? item.real_pool : item.virtual_pool;
      if (item.options && item.options.length > 0) {
        const answerOptions = getItemAnswerOptions(item, ledger, "en");
        const optSig = answerOptions
          .map((o) => `${o.id}:${o.seedCount}:${o.realCount}`)
          .join(",");
        return `${item.id}:opts:${optSig}:${poolTotalForItem(item, ledger)}`;
      }
      const { yes, no } = poolYesNoCounts(item, ledger);
      return `${item.id}:${yes}:${no}:${poolTotalForItem(item, ledger)}`;
    })
    .sort()
    .join("|");
}

export const VOLUME_CHART_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f97316",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#eab308",
  "#ec4899",
];
