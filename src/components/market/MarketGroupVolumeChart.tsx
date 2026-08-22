import type { VolumeLedger, VolumeRange } from "@/lib/markets/volumeShare";
import { isLiveVolumeRange } from "@/lib/markets/volumeShare";
import { useMarketVolumeHistory } from "@/hooks/useMarketVolumeHistory";
import type { MarketItem } from "@/hooks/useMarketGroupDetail";
import { fmtLedger, type LedgerKind } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MarketChanceLineChart } from "./MarketChanceLineChart";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const HISTORY_RANGES = ["5MIN", "15MIN", "1H", "6H", "1D", "1W", "1M", "ALL"] as const satisfies VolumeRange[];

function itemTerminal(item: MarketItem): boolean {
  if (item.status === "settled" || item.status === "cancelled" || item.status === "voided") {
    return true;
  }
  return new Date(item.close_time) < new Date();
}

function defaultVolumeRange(items: MarketItem[]): VolumeRange {
  return items.length > 0 && items.every(itemTerminal) ? "1D" : "LIVE";
}

type Props = {
  marketId: string;
  items: MarketItem[];
  ledger: VolumeLedger;
  ledgerLabel: LedgerKind;
  forceLiveAppendKey?: number;
  lang: "en" | "my";
  /** When false, hides total pool volume (guests). */
  showVolume?: boolean;
};

export function MarketGroupVolumeChart({
  marketId,
  items,
  ledger,
  ledgerLabel,
  forceLiveAppendKey = 0,
  lang,
  showVolume = true,
}: Props) {
  const { t, i18n } = useTranslation();
  const [range, setRange] = useState<VolumeRange>(() => defaultVolumeRange(items));
  const liveDisabled = useMemo(
    () => items.length > 0 && items.every(itemTerminal),
    [items],
  );

  useEffect(() => {
    setRange(defaultVolumeRange(items));
  }, [marketId]);

  useEffect(() => {
    if (liveDisabled && isLiveVolumeRange(range)) {
      setRange("1D");
    }
  }, [liveDisabled, range]);

  const liveAppendKey = isLiveVolumeRange(range) ? forceLiveAppendKey : 0;

  const { chartData, chartLines, legendPct, totalVolume, isLoading, isError } = useMarketVolumeHistory({
    marketId,
    items,
    ledger,
    range,
    forceLiveAppendKey: liveAppendKey,
    lang,
  });

  const lines = chartLines;
  const locale = i18n.language === "my" ? "my-MM" : "en-US";
  const hasChartData = chartData.length > 0;
  const hasPools = totalVolume > 0;

  const renderRangePill = (pill: VolumeRange) => {
    const isLive = pill === "LIVE";
    const disabled = isLive && liveDisabled;
    const selected = range === pill;

    const button = (
      <button
        key={pill}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setRange(pill);
          }
        }}
        className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:text-foreground",
          disabled && "cursor-not-allowed opacity-50 hover:text-muted-foreground",
        )}
      >
        {t(`market.volumeRange.${pill}`)}
      </button>
    );

    if (!disabled) {
      return button;
    }

    return (
      <Tooltip key={pill}>
        <TooltipTrigger asChild>
          <span className="inline-flex">{button}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          {t("market.volumeRangeLiveDisabled")}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold">{t("market.groupVolumeChart")}</h2>
            <p className="text-[11px] text-muted-foreground">{t("market.groupVolumeChartHint")}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {renderRangePill("LIVE")}
            {HISTORY_RANGES.map((pill) => renderRangePill(pill))}
          </div>
        </div>

        {isLoading && !hasChartData ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : isError && !hasChartData ? (
          <p className="py-16 text-center text-sm text-destructive">{t("market.volumeHistoryError")}</p>
        ) : !hasChartData && !hasPools ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("market.volumeHistoryEmpty")}
          </p>
        ) : !hasChartData && hasPools ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("market.volumeHistoryEmpty")}
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2">
              {lines.map((line) => (
                <div key={line.itemId} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: line.color }} />
                  <span className="text-muted-foreground">{line.label}</span>
                  <span className="font-semibold tabular-nums">
                    {(legendPct.get(line.itemId) ?? 0).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>

            <div className="h-56 w-full min-h-[14rem] min-w-0">
              <MarketChanceLineChart
                chartData={chartData}
                chartLines={chartLines}
                range={range}
                locale={locale}
                className="h-full"
              />
            </div>
          </>
        )}

        {showVolume && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("market.volumeShort")}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {fmtLedger(totalVolume, ledgerLabel, { compact: true })}
            </span>
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}
