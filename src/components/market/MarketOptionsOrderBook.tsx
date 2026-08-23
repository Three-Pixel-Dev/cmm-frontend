import { fmtShares } from "@/lib/format";
import type { ItemAnswerOption } from "@/lib/markets/marketItemOptions";
import { optionEffectiveShares, optionImpliedPercent } from "@/lib/markets/optionPricing";
import type { ApiMarketPool } from "@/types/market-api";
import { optionTitle } from "@/lib/markets/marketItemOptions";

type Props = {
  options: ItemAnswerOption[];
  legacyPool?: ApiMarketPool | null;
  lang: "en" | "my";
  showShareCounts?: boolean;
};

export function MarketOptionsOrderBook({
  options,
  legacyPool,
  lang,
  showShareCounts = true,
}: Props) {
  if (options.length === 0) return null;

  return (
    <div className="space-y-2">
      {options.map((option, index) => {
        const pct = Math.round(optionImpliedPercent(option, options, legacyPool));
        const activeShares = optionEffectiveShares(option, options, legacyPool);

        return (
          <div
            key={option.id}
            className="flex items-center justify-between gap-3 rounded px-2 py-2 tabular-nums text-xs bg-elevated/40"
          >
            <span className="min-w-0 flex-1 truncate font-medium">{optionTitle(option, lang)}</span>
            <span
              className={index === 0 ? "text-yes" : index === 1 ? "text-no" : "text-foreground"}
            >
              {pct}%
            </span>
            {showShareCounts && (
              <span className="text-muted-foreground w-16 text-right">
                {fmtShares(activeShares)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
