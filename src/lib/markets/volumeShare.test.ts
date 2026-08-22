import { describe, expect, it } from "vitest";
import type { MarketItem } from "@/hooks/useMarketGroupDetail";
import {
  buildChartLines,
  buildHistoricalChartRows,
  buildLiveChartRows,
  buildLiveVolumePoint,
  buildFallbackChartRows,
  computeGroupVolumeShares,
  isLivePointCoveredByHistory,
  mergeVolumeRowsForRange,
  padChartRowsForLineDisplay,
  projectVolumeRowsForChart,
  shouldDiscardVolumeHistory,
  mergeVolumeHistoryWithLivePoint,
  mergeVolumeHistoryWithLivePoints,
  shouldWidenVolumeHistoryFetch,
  isFlatVolumeHistory,
  trimVolumeChartToRange,
  volumeChartRangeEnd,
  volumeChartTimeDomain,
  widenVolumeHistoryRange,
  appendLiveVolumePoint,
  volumeHistoryToChartRows,
  type VolumeHistorySeries,
} from "@/lib/markets/volumeShare";
import { getItemAnswerOptions } from "@/lib/markets/marketItemOptions";

function item(id: string, total: number, yes = 0, no = 0): MarketItem {
  return {
    id,
    slug: id,
    title: { en: id, my: id },
    description: { en: "", my: "" },
    start_time: new Date().toISOString(),
    close_time: new Date().toISOString(),
    resolution_time: new Date().toISOString(),
    resolved_time: null,
    status: "open",
    outcome: null,
    one_share_price: 1000,
    platform_fee_percentage: 5,
    real_pool: {
      seed_retirement_threshold: 0.8,
      seed_yes_count: 0,
      seed_no_count: 0,
      real_yes_count: yes,
      real_no_count: no,
      total_pool: total,
    },
    virtual_pool: null,
  };
}

describe("volumeShare", () => {
  it("transforms API series into wide chart rows", () => {
    const series: VolumeHistorySeries[] = [
      {
        market_item_id: "a",
        title_en: "A",
        title_my: "A",
        current_pct: 60,
        points: [
          { t: "2026-06-01T00:00:00.000Z", pct: 40 },
          { t: "2026-06-02T00:00:00.000Z", pct: 60 },
        ],
      },
      {
        market_item_id: "b",
        title_en: "B",
        title_my: "B",
        current_pct: 40,
        points: [
          { t: "2026-06-01T00:00:00.000Z", pct: 60 },
          { t: "2026-06-02T00:00:00.000Z", pct: 40 },
        ],
      },
    ];

    const rows = volumeHistoryToChartRows(series);
    expect(rows).toHaveLength(2);
    expect(rows[0].a).toBe(40);
    expect(rows[0].b).toBe(60);
    expect(rows[1].a).toBe(60);
    expect(rows[1].b).toBe(40);
  });

  it("recomputes yes chance when one item's yes share grows", () => {
    const before = computeGroupVolumeShares(
      [
        item("a", 110_000, 10, 12),
        item("b", 110_000, 12, 10),
      ],
      "real",
    );
    const after = computeGroupVolumeShares(
      [
        item("a", 120_000, 15, 12),
        item("b", 110_000, 12, 10),
      ],
      "real",
    );

    expect(before.get("a")).toBeCloseTo(45.45, 2);
    expect(before.get("b")).toBeCloseTo(54.55, 2);
    expect(after.get("a")).toBeCloseTo(55.56, 2);
    expect(after.get("b")).toBeCloseTo(54.55, 2);
  });

  it("appends live points and trims to selected range", () => {
    const now = Date.now();
    const history = [{ t: now - 30 * 60 * 1000, a: 50, b: 50 }];
    const live = buildLiveVolumePoint(
      [item("a", 600, 6, 4), item("b", 400, 2, 8)],
      "real",
      now,
    );
    const merged = mergeVolumeHistoryWithLivePoint(history, live, "1H", ["a", "b"]);

    expect(merged).toHaveLength(2);
    expect(merged[1].a).toBe(60);
    expect(trimVolumeChartToRange(merged, "1H")).toHaveLength(2);
  });

  it("keeps live tail when API history has a recent snapshot but chance changed", () => {
    const now = Date.now();
    const history = [{ t: now - 5_000, a: 50, b: 50 }];
    const live = buildLiveVolumePoint([item("a", 600, 6, 4), item("b", 400, 2, 8)], "real", now);
    const merged = mergeVolumeHistoryWithLivePoint(history, live, "1H", ["a", "b"]);

    expect(merged).toHaveLength(2);
    expect(merged[1].a).toBe(60);
    expect(isLivePointCoveredByHistory(history, live, "1H", ["a", "b"])).toBe(false);
  });

  it("accumulates live trail so past values stay at their timestamp (Polymarket-style)", () => {
    const t0 = Date.now() - 120_000;
    const t1 = Date.now() - 60_000;
    const t2 = Date.now();
    const p0 = { t: t0, a: 30 };
    const p1 = { t: t1, a: 55 };
    const p2 = { t: t2, a: 90 };

    let trail = appendLiveVolumePoint([], p0, "LIVE", ["a"]);
    trail = appendLiveVolumePoint(trail, p1, "LIVE", ["a"]);
    trail = appendLiveVolumePoint(trail, p2, "LIVE", ["a"]);

    expect(trail).toHaveLength(3);
    expect(trail[0].a).toBe(30);
    expect(trail[1].a).toBe(55);
    expect(trail[2].a).toBe(90);

    const liveChart = buildLiveChartRows(trail, ["a"]);
    expect(liveChart.length).toBeGreaterThanOrEqual(2);
    expect(liveChart[liveChart.length - 1].a).toBe(90);
  });

  it("keeps multiple live trail points on 1M even within the same UTC day", () => {
    const now = Date.now();
    const p0 = { t: now - 120_000, a: 25 };
    const p1 = { t: now - 60_000, a: 55 };
    const p2 = { t: now, a: 85 };

    let trail = appendLiveVolumePoint([], p0, "1M", ["a"]);
    trail = appendLiveVolumePoint(trail, p1, "1M", ["a"]);
    trail = appendLiveVolumePoint(trail, p2, "1M", ["a"]);

    expect(trail).toHaveLength(3);
    expect(trail[0].a).toBe(25);
    expect(trail[1].a).toBe(55);
    expect(trail[2].a).toBe(85);

    const merged5m = mergeVolumeHistoryWithLivePoints([], trail, "5MIN", ["a"]);
    expect(merged5m).toHaveLength(3);

    const merged1m = mergeVolumeHistoryWithLivePoints([], trail, "1M", ["a"]);
    expect(merged1m).toHaveLength(1);
    expect(merged1m[0].a).toBe(85);
  });

  it("uses second buckets for short ranges and day buckets for 1M", () => {
    const day1 = Date.UTC(2026, 5, 1, 10, 0, 0);
    const day1Later = Date.UTC(2026, 5, 1, 14, 30, 0);
    const day2 = Date.UTC(2026, 5, 2, 9, 0, 0);
    const rows = [
      { t: day1, a: 40 },
      { t: day1Later, a: 55 },
      { t: day2, a: 60 },
    ];
    const bySecond = mergeVolumeRowsForRange(rows, ["a"], "1D");
    expect(bySecond).toHaveLength(3);

    const byDay = mergeVolumeRowsForRange(rows, ["a"], "1M");
    expect(byDay).toHaveLength(2);
    expect(byDay[1].a).toBe(60);
  });

  it("builds a visible flat line when only current pools exist", () => {
    const rows = buildFallbackChartRows([item("a", 155_000, 10, 12)], "real", "ALL");
    expect(rows).toHaveLength(2);
    expect(rows[0].a).toBeCloseTo(45.45, 2);
    expect(rows[1].a).toBeCloseTo(45.45, 2);
    expect(rows[0].t).toBeLessThan(rows[1].t);
  });

  it("anchors short-range trim to last snapshot when activity ended (post load test)", () => {
    const testEnd = Date.now() - 10 * 60 * 1000;
    const rows = [
      { t: testEnd - 4 * 60 * 1000, a: 25 },
      { t: testEnd - 3 * 60 * 1000, a: 55 },
      { t: testEnd - 2 * 60 * 1000, a: 80 },
      { t: testEnd - 1 * 60 * 1000, a: 30 },
      { t: testEnd, a: 52 },
    ];
    const trimmed = trimVolumeChartToRange(rows, "5MIN");
    expect(trimmed.length).toBeGreaterThanOrEqual(4);
    expect(trimmed[0].a).toBe(25);
    expect(trimmed[trimmed.length - 1].a).toBe(52);
  });

  it("widenVolumeHistoryRange expands 5MIN to 1H when sparse", () => {
    expect(shouldWidenVolumeHistoryFetch("5MIN", [])).toBe(true);
    expect(shouldWidenVolumeHistoryFetch("5MIN", [{ t: Date.now(), a: 50 }])).toBe(true);
    expect(
      shouldWidenVolumeHistoryFetch("5MIN", [
        { t: Date.now() - 60_000, a: 40 },
        { t: Date.now(), a: 60 },
      ]),
    ).toBe(false);
    expect(widenVolumeHistoryRange("5MIN")).toBe("1H");
  });

  it("detects flat persisted history so live trail can take over", () => {
    const t = Date.now();
    const flat = [
      { t: t - 120_000, a: 55.1 },
      { t: t - 60_000, a: 55.0 },
      { t, a: 55.2 },
    ];
    expect(isFlatVolumeHistory(flat, ["a"])).toBe(true);
    const varied = [
      { t: t - 120_000, a: 25 },
      { t: t - 60_000, a: 55 },
      { t, a: 85 },
    ];
    expect(isFlatVolumeHistory(varied, ["a"])).toBe(false);
  });

  it("pads a single chart row so Recharts can draw a segment", () => {
    const now = Date.now();
    const padded = padChartRowsForLineDisplay([{ t: now, a: 100 }], "ALL", ["a"]);
    expect(padded).toHaveLength(2);
    expect(padded[0].a).toBe(100);
    expect(padded[1].a).toBe(100);
  });

  it("projects uuid-keyed rows onto simple recharts series keys", () => {
    const now = Date.now();
    const idA = "550e8400-e29b-41d4-a716-446655440000";
    const idB = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    const lines = buildChartLines(
      [item(idA, 110_000, 10, 12), item(idB, 110_000, 12, 10)],
      [],
      "en",
    );
    const projected = projectVolumeRowsForChart(
      [{ t: now, [idA]: 45.45, [idB]: 54.55 }],
      lines,
    );
    expect(projected[0].s0).toBeCloseTo(45.45, 2);
    expect(projected[0].s1).toBeCloseTo(54.55, 2);
  });

  it("drops legacy equal-split history when live chances moved", () => {
    const idA = "a";
    const idB = "b";
    const stale = [
      { t: Date.now() - 86_400_000, [idA]: 50, [idB]: 50 },
      { t: Date.now() - 43_200_000, [idA]: 50, [idB]: 50 },
    ];
    expect(
      shouldDiscardVolumeHistory(
        stale,
        [item(idA, 110_000, 14, 8), item(idB, 110_000, 12, 10)],
        "real",
      ),
    ).toBe(true);
  });

  it("historical rangeEnd anchors on last snapshot not wall clock", () => {
    const testEnd = Date.UTC(2026, 5, 30, 12, 0, 0);
    const rows = [
      { t: testEnd - 2 * 60 * 1000, a: 50 },
      { t: testEnd, a: 60 },
    ];
    expect(volumeChartRangeEnd(rows, "5MIN")).toBe(testEnd);
  });

  it("buildHistoricalChartRows returns empty without snapshots", () => {
    expect(buildHistoricalChartRows([], "5MIN", ["a"])).toEqual([]);
  });

  it("buildHistoricalChartRows trims to snapshot window", () => {
    const end = Date.UTC(2026, 5, 30, 12, 0, 0);
    const rows = [
      { t: end - 6 * 60 * 1000, a: 40 },
      { t: end - 4 * 60 * 1000, a: 55 },
      { t: end - 2 * 60 * 1000, a: 70 },
      { t: end, a: 65 },
    ];
    const out = buildHistoricalChartRows(rows, "5MIN", ["a"]);
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(out[out.length - 1].a).toBe(65);
    expect(out[0].t).toBeGreaterThanOrEqual(end - 5 * 60 * 1000);
  });

  it("volumeChartTimeDomain spans full historical window", () => {
    const end = Date.UTC(2026, 5, 30, 12, 0, 0);
    const rows = [{ t: end - 2 * 60 * 1000, a: 50 }, { t: end, a: 60 }];
    expect(volumeChartTimeDomain(rows, "5MIN")).toEqual([end - 5 * 60 * 1000, end]);
  });

  it("legacy pool fallback yields non-50% chance for seeded binary markets", () => {
    const marketItem: MarketItem = {
      ...item("a", 1500, 0, 0),
      options: [
        {
          id: "opt-yes",
          sort_order: 0,
          title_en: "Yes",
          title_my: "Yes",
          real_pool: { seed_count: 0, real_count: 0 },
        },
        {
          id: "opt-no",
          sort_order: 1,
          title_en: "No",
          title_my: "No",
          real_pool: { seed_count: 0, real_count: 0 },
        },
      ],
      real_pool: {
        seed_retirement_threshold: 0.8,
        seed_yes_count: 1000,
        seed_no_count: 500,
        real_yes_count: 0,
        real_no_count: 0,
        total_pool: 1500,
      },
    };
    const options = getItemAnswerOptions(marketItem, "real", "en");
    expect(options[0].seedCount).toBe(1000);
    expect(options[1].seedCount).toBe(500);
    expect(computeGroupVolumeShares([marketItem], "real").get("a")).toBeCloseTo(66.67, 1);
  });
});
