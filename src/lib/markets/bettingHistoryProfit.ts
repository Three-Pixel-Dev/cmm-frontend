import type { ApiBettingHistory } from "@/types/bet-api";
import type { ApiMarketItem, ApiMarketStatus } from "@/types/market-api";
import { activeBetProfitIfWins, poolEligibilityFromApi } from "@/lib/markets/betEligibility";
import { activeBetProfitIfOptionWins } from "@/lib/markets/optionEligibility";
import { getItemAnswerOptions } from "@/lib/markets/marketItemOptions";

const NIL_OPTION_ID = "00000000-0000-0000-0000-000000000000";
const TERMINAL_MARKET_STATUSES: ApiMarketStatus[] = ["settled", "cancelled", "voided"];

export function isValidBetOptionId(optionId?: string | null): boolean {
  return !!optionId && optionId !== NIL_OPTION_ID;
}

/** Resolve which option a bet is on (API option_id or legacy side mapping). */
export function resolveBetOptionId(
  history: ApiBettingHistory,
  item: ApiMarketItem | null | undefined,
  ledger: "real" | "virtual",
): string | undefined {
  if (!item) return undefined;

  const options = getItemAnswerOptions(item, ledger, "en");
  if (isValidBetOptionId(history.option_id) && options.some((o) => o.id === history.option_id)) {
    return history.option_id;
  }

  if (options.length > 2) {
    const sorted = [...options].sort((a, b) => a.sortOrder - b.sortOrder);
    if (history.side === "yes") return sorted[0]?.id;
    if (history.side === "no" && sorted.length > 1) return sorted[1]?.id;
  }

  return undefined;
}

export function isActiveBettingHistory(
  history: ApiBettingHistory,
  item?: ApiMarketItem | null,
): boolean {
  if (history.status && history.status !== "active") return false;
  if (!item) return false;
  if (TERMINAL_MARKET_STATUSES.includes(item.status)) return false;
  return true;
}

export function potentialProfitForBet(
  history: ApiBettingHistory,
  item?: ApiMarketItem | null,
): number | null {
  if (!isActiveBettingHistory(history, item)) return null;

  const pool = history.ledger === "virtual" ? item?.virtual_pool : item?.real_pool;
  if (!pool || !item || item.one_share_price <= 0) return null;

  const ledger = history.ledger === "virtual" ? "virtual" : "real";
  const options = getItemAnswerOptions(item, ledger, "en");
  const optionId = resolveBetOptionId(history, item, ledger);

  if (optionId) {
    const { profit } = activeBetProfitIfOptionWins(
      optionId,
      history.shares,
      history.amount,
      options,
      pool,
      item.one_share_price,
      item.platform_fee_percentage,
    );
    return profit;
  }

  if (options.length > 2) return null;

  const { profit } = activeBetProfitIfWins(
    history.side,
    history.shares,
    history.amount,
    poolEligibilityFromApi(pool),
    item.one_share_price,
    item.platform_fee_percentage,
  );

  return profit;
}

export function bettingHistoryAnswerLabel(
  history: ApiBettingHistory,
  item?: ApiMarketItem | null,
  lang: "en" | "my" = "en",
): string {
  const ledger = history.ledger === "virtual" ? "virtual" : "real";
  const optionId = resolveBetOptionId(history, item, ledger);

  if (optionId && item?.options?.length) {
    const opt = item.options.find((o) => o.id === optionId);
    if (opt) return lang === "my" ? opt.title_my || opt.title_en : opt.title_en;
  }

  if (history.side === "yes") return lang === "my" ? "ဟုတ်ကဲ့" : "Yes";
  if (history.side === "no") return lang === "my" ? "မဟုတ်ပါ" : "No";
  return history.side;
}
