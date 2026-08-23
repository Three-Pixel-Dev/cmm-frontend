import { cn } from "@/lib/utils";
import type { ItemAnswerOption } from "@/lib/markets/marketItemOptions";
import { optionTitle } from "@/lib/markets/marketItemOptions";
import { optionImpliedPercent } from "@/lib/markets/optionPricing";
import type { ApiMarketPool } from "@/types/market-api";

type Props = {
  options: ItemAnswerOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  legacyPool?: ApiMarketPool | null;
  lang: "en" | "my";
  binaryStyle?: boolean;
};

const OPTION_COLORS = [
  "border-yes bg-yes/20 text-yes",
  "border-no bg-no/20 text-no",
  "border-primary bg-primary/15 text-primary",
  "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "border-cyan-500 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
];

export function MarketOptionPicker({
  options,
  selectedId,
  onSelect,
  legacyPool,
  lang,
  binaryStyle = false,
}: Props) {
  const gridCols =
    options.length <= 2
      ? "grid-cols-2"
      : options.length === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className={cn("my-3 grid gap-2", gridCols)}>
      {options.map((option, index) => {
        const pct = Math.round(optionImpliedPercent(option, options, legacyPool));
        const selected = option.id === selectedId;
        const color =
          binaryStyle && index < 2
            ? OPTION_COLORS[index]
            : OPTION_COLORS[index % OPTION_COLORS.length];

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={cn(
              "rounded-lg border py-3 px-2 text-center font-semibold transition-all min-w-0",
              selected
                ? color
                : "border-border bg-elevated text-muted-foreground hover:text-foreground",
            )}
          >
            <div className="text-xs uppercase opacity-80 line-clamp-2 leading-snug">
              {optionTitle(option, lang)}
            </div>
            <div className="text-lg tabular-nums">{pct}%</div>
          </button>
        );
      })}
    </div>
  );
}
