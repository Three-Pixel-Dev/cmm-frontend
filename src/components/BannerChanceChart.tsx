import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { MarketItem } from "@/hooks/useMarketGroupDetail";
import { useMarketVolumeHistory } from "@/hooks/useMarketVolumeHistory";
import type { MarketItemRow } from "@/lib/markets/types";
import { cn } from "@/lib/utils";
import { MarketChanceLineChart } from "@/components/market/MarketChanceLineChart";

const BANNER_RANGE = "1W" as const;
const BANNER_LEDGER = "real" as const;

function toChartItems(items: MarketItemRow[]): MarketItem[] {
  return items.map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    description: { en: "", my: "" },
    start_time: item.endDate,
    close_time: item.endDate,
    resolution_time: item.endDate,
    resolved_time: null,
    status: (item.status ?? "open") as MarketItem["status"],
    outcome: item.outcome ?? null,
    winning_option_id: item.winning_option_id,
    one_share_price: 0,
    platform_fee_percentage: 0,
    real_pool: item.real_pool ?? null,
    options: item.options,
  }));
}

export type BannerChanceChartProps = {
  marketId: string;
  items: MarketItemRow[];
  lang: "en" | "my";
  enabled?: boolean;
  className?: string;
};

export function BannerChanceChart({
  marketId,
  items,
  lang,
  enabled = true,
  className,
}: BannerChanceChartProps) {
  const { t, i18n } = useTranslation();
  const chartItems = useMemo(() => toChartItems(items), [items]);

  const { chartData, chartLines, legendPct, totalVolume, isLoading, isError } = useMarketVolumeHistory({
    marketId,
    items: chartItems,
    ledger: BANNER_LEDGER,
    range: BANNER_RANGE,
    lang,
    enabled,
  });

  const locale = i18n.language === "my" ? "my-MM" : "en-US";
  const hasChartData = chartData.length > 0;
  const hasPools = totalVolume > 0;

  if (!enabled) {
    return (
      <div
        className={cn("flex h-full min-h-[200px] items-center justify-center bg-elevated/50", className)}
        aria-hidden
      />
    );
  }

  if (isLoading && !hasChartData) {
    return (
      <div
        className={cn("flex h-full min-h-[200px] items-center justify-center bg-elevated/50", className)}
        role="status"
        aria-label={t("common.loading")}
      >
        <div className="h-full w-full animate-pulse bg-gradient-to-br from-muted/30 via-muted/10 to-transparent" />
      </div>
    );
  }

  if ((isError && !hasChartData) || (!hasChartData && !hasPools)) {
    return (
      <div
        className={cn(
          "flex h-full min-h-[200px] items-center justify-center px-4 text-center text-xs text-muted-foreground",
          className,
        )}
      >
        {isError ? t("market.volumeHistoryError") : t("market.volumeHistoryEmpty")}
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-[200px] flex-col p-3 pt-4", className)}>
      <MarketChanceLineChart
        chartData={chartData}
        chartLines={chartLines}
        range={BANNER_RANGE}
        locale={locale}
        showLegend
        legendPct={legendPct}
        yAxisOrientation="right"
        compact
        className="h-full"
      />
    </div>
  );
}
