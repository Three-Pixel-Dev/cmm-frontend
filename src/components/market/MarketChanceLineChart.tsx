import type { ChartLineDef, VolumeChartRow, VolumeRange } from "@/lib/markets/volumeShare";
import { isHistoricalVolumeRange, volumeChartTimeDomain } from "@/lib/markets/volumeShare";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function formatChanceAxisTime(value: number, range: VolumeRange, locale: string): string {
  const date = new Date(value);
  if (range === "LIVE" || range === "5MIN" || range === "15MIN") {
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  if (range === "1H" || range === "6H") {
    return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }
  if (range === "1D" || range === "1W") {
    return date.toLocaleDateString(locale, { month: "short", day: "numeric", hour: "2-digit" });
  }
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

export type MarketChanceLineChartProps = {
  chartData: VolumeChartRow[];
  chartLines: ChartLineDef[];
  range: VolumeRange;
  locale: string;
  className?: string;
  showLegend?: boolean;
  legendPct?: Map<string, number>;
  yAxisOrientation?: "left" | "right";
  compact?: boolean;
};

export function MarketChanceLineChart({
  chartData,
  chartLines,
  range,
  locale,
  className,
  showLegend = false,
  legendPct,
  yAxisOrientation = "left",
  compact = false,
}: MarketChanceLineChartProps) {
  const fontSize = compact ? 9 : 10;
  const yAxisWidth = compact ? 32 : 40;
  const lastIndex = chartData.length - 1;
  const lastRow = lastIndex >= 0 ? chartData[lastIndex] : null;
  const chartRevision =
    lastRow != null
      ? `${chartData.length}:${lastRow.t}:${chartLines.map((line) => lastRow[line.key]).join(",")}`
      : "empty";

  const xDomain = useMemo(() => {
    if (!isHistoricalVolumeRange(range)) {
      return ["dataMin", "dataMax"] as const;
    }
    const fixed = volumeChartTimeDomain(chartData, range);
    if (fixed) {
      return fixed;
    }
    return ["dataMin", "dataMax"] as const;
  }, [chartData, range]);

  return (
    <div className={cn("flex h-full w-full flex-col", className)}>
      {showLegend && legendPct && chartLines.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 px-1">
          {chartLines.map((line) => (
            <div key={line.itemId} className="flex items-center gap-1.5 text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: line.color }} />
              <span className="max-w-[6rem] truncate text-muted-foreground">{line.label}</span>
              <span className="font-semibold tabular-nums">
                {(legendPct.get(line.itemId) ?? 0).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="min-h-0 min-w-0 flex-1" style={{ height: 224 }}>
        <ResponsiveContainer width="100%" height={224} minWidth={0}>
          <LineChart
            key={chartRevision}
            data={chartData}
            margin={{
              top: compact ? 4 : 8,
              right: yAxisOrientation === "right" ? yAxisWidth : compact ? 4 : 8,
              left: yAxisOrientation === "left" ? yAxisWidth - 12 : compact ? 4 : -12,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.5 0 0 / 0.12)" />
            <XAxis
              dataKey="t"
              type="number"
              domain={xDomain}
              tickFormatter={(value) => formatChanceAxisTime(Number(value), range, locale)}
              fontSize={fontSize}
              minTickGap={compact ? 32 : 24}
              tick={{ fill: "oklch(0.65 0 0)" }}
            />
            <YAxis
              type="number"
              domain={[0, 100]}
              allowDataOverflow
              orientation={yAxisOrientation}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(value) => `${value}%`}
              width={yAxisWidth}
              fontSize={fontSize}
              tick={{ fill: "oklch(0.65 0 0)" }}
            />
            <Tooltip
              labelFormatter={(value) => formatChanceAxisTime(Number(value), range, locale)}
              formatter={(value, _name, item) => {
                const line = chartLines.find((entry) => entry.key === item.dataKey);
                return [`${Number(value).toFixed(1)}%`, line?.label ?? String(item.dataKey)];
              }}
            />
            {chartLines.map((line) => (
              <Line
                key={line.key}
                type="linear"
                dataKey={line.key}
                name={line.label}
                stroke={line.color}
                strokeWidth={compact ? 1.5 : 2}
                dot={(props) => {
                  const { cx, cy, index, stroke } = props;
                  if (index !== lastIndex || cx == null || cy == null) {
                    return null;
                  }
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={compact ? 3 : 4}
                      fill={stroke}
                      strokeWidth={0}
                    />
                  );
                }}
                activeDot={{ r: compact ? 4 : 5, strokeWidth: 0 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
