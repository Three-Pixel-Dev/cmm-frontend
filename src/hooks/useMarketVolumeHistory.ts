import {
  appendLiveVolumePoint,
  buildChartLines,
  buildHistoricalChartRows,
  buildLiveChartRows,
  buildLiveVolumePoint,
  computeGroupTotalVolume,
  computeGroupVolumeShares,
  isHistoricalVolumeRange,
  isLiveVolumeRange,
  poolsSignature,
  projectVolumeRowsForChart,
  shouldDiscardVolumeHistory,
  shouldWidenVolumeHistoryFetch,
  widenVolumeHistoryRange,
  type VolumeChartRow,
  type VolumeHistoryResponse,
  type VolumeLedger,
  type VolumeRange,
  volumeHistoryToChartRows,
} from "@/lib/markets/volumeShare";
import type { MarketItem } from "@/hooks/useMarketGroupDetail";
import { MARKET_VOLUME_HISTORY_KEY } from "@/hooks/useMarketGroupDetail";
import { marketsApi } from "@/lib/api/markets";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Options = {
  marketId: string;
  items: MarketItem[];
  ledger: VolumeLedger;
  range: VolumeRange;
  forceLiveAppendKey?: number;
  lang: "en" | "my";
  enabled?: boolean;
};

export function useMarketVolumeHistory({
  marketId,
  items,
  ledger,
  range,
  forceLiveAppendKey = 0,
  lang,
  enabled = true,
}: Options) {
  const [liveRows, setLiveRows] = useState<VolumeChartRow[]>([]);
  const lastSignatureRef = useRef("");
  const forcedKeyRef = useRef(forceLiveAppendKey);
  const isLive = isLiveVolumeRange(range);

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const historyQuery = useQuery({
    queryKey: [MARKET_VOLUME_HISTORY_KEY, marketId, ledger, range],
    enabled: enabled && !!marketId && isHistoricalVolumeRange(range),
    queryFn: async () => {
      if (!isHistoricalVolumeRange(range)) {
        throw new Error("volume history requested for live range");
      }
      const primary = await marketsApi.getVolumeHistory(marketId, { ledger, range });
      const primaryRows = volumeHistoryToChartRows(primary.series ?? []);
      if (!shouldWidenVolumeHistoryFetch(range, primaryRows)) {
        return primary;
      }
      const widerRange = widenVolumeHistoryRange(range);
      const wider = await marketsApi.getVolumeHistory(marketId, { ledger, range: widerRange });
      return wider;
    },
    staleTime: 0,
    refetchInterval:
      range === "5MIN" || range === "15MIN"
        ? 5_000
        : range === "1H"
          ? 15_000
          : false,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    setLiveRows([]);
    lastSignatureRef.current = "";
  }, [marketId, ledger, range]);

  useEffect(() => {
    if (!isLive || !items.length) {
      return;
    }
    setLiveRows((prev) => {
      if (prev.length > 0) {
        return prev;
      }
      const point = buildLiveVolumePoint(items, ledger, Date.now());
      lastSignatureRef.current = poolsSignature(items, ledger);
      return [point];
    });
  }, [marketId, ledger, items, isLive]);

  useEffect(() => {
    if (!isLive || !items.length) {
      return;
    }

    const signature = poolsSignature(items, ledger);
    const forced = forceLiveAppendKey !== forcedKeyRef.current;
    if (!forced && signature === lastSignatureRef.current) {
      return;
    }

    const now = Date.now();
    const point = buildLiveVolumePoint(items, ledger, now);

    setLiveRows((prev) => appendLiveVolumePoint(prev, point, "LIVE", itemIds));

    lastSignatureRef.current = signature;
    forcedKeyRef.current = forceLiveAppendKey;
  }, [items, ledger, forceLiveAppendKey, isLive, itemIds]);

  const chartLines = useMemo(
    () => buildChartLines(items, historyQuery.data?.series ?? [], lang),
    [items, historyQuery.data?.series, lang],
  );

  const chartData = useMemo(() => {
    if (isLive) {
      const liveChart = buildLiveChartRows(liveRows, itemIds);
      return projectVolumeRowsForChart(liveChart, chartLines, "LIVE");
    }

    const series = historyQuery.data?.series ?? [];
    let baseRows = volumeHistoryToChartRows(series);
    if (shouldDiscardVolumeHistory(baseRows, items, ledger)) {
      baseRows = [];
    }

    if (!isHistoricalVolumeRange(range)) {
      return [];
    }

    const historical = buildHistoricalChartRows(baseRows, range, itemIds);
    return projectVolumeRowsForChart(historical, chartLines, range);
  }, [
    isLive,
    liveRows,
    itemIds,
    chartLines,
    historyQuery.data?.series,
    items,
    ledger,
    range,
  ]);

  const legendPct = useMemo(() => computeGroupVolumeShares(items, ledger), [items, ledger]);

  const totalVolume = useMemo(() => {
    if (!isLive) {
      const apiTotal = historyQuery.data?.total_volume;
      if (typeof apiTotal === "number" && apiTotal > 0) {
        return apiTotal;
      }
    }
    return computeGroupTotalVolume(items, ledger);
  }, [historyQuery.data?.total_volume, items, ledger, isLive]);

  const appendLiveNow = useCallback(() => {
    if (!isLive || !items.length) {
      return;
    }
    const now = Date.now();
    const point = buildLiveVolumePoint(items, ledger, now);
    lastSignatureRef.current = poolsSignature(items, ledger);
    setLiveRows((prev) => appendLiveVolumePoint(prev, point, "LIVE", itemIds));
  }, [items, ledger, isLive, itemIds]);

  return {
    chartData,
    chartLines,
    legendPct,
    totalVolume,
    series: historyQuery.data?.series ?? ([] as VolumeHistoryResponse["series"]),
    isLoading: !isLive && historyQuery.isLoading,
    isError: !isLive && historyQuery.isError,
    appendLiveNow,
  };
}
