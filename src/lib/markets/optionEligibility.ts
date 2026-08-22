import type { ApiMarketPool } from "@/types/market-api";
import type { ItemAnswerOption } from "@/lib/markets/marketItemOptions";
import { MAX_REAL_IMBALANCE_RATIO } from "@/lib/markets/betEligibility";

function isSeedRetired(options: ItemAnswerOption[], threshold: number): boolean {
  const seedTotal = options.reduce((s, o) => s + o.seedCount, 0);
  const realTotal = options.reduce((s, o) => s + o.realCount, 0);
  if (seedTotal <= 0) return true;
  if (realTotal <= 0) return false;
  const t = threshold > 0 ? threshold : 0.8;
  return realTotal / seedTotal >= t;
}

function previewWinningSharesAfterBet(
  option: ItemAnswerOption,
  shares: number,
  retired: boolean,
): number {
  return (retired ? option.realCount : option.seedCount + option.realCount) + shares;
}

function realWinningSharesAfterBet(option: ItemAnswerOption, shares: number): number {
  return option.realCount + shares;
}

function otherRealLiquidity(targetId: string, options: ItemAnswerOption[]): number {
  let sum = 0;
  for (const o of options) {
    if (o.id === targetId) continue;
    sum += o.realCount;
  }
  return sum;
}

function otherLiquidity(
  targetId: string,
  options: ItemAnswerOption[],
  retired: boolean,
): number {
  let sum = 0;
  for (const o of options) {
    if (o.id === targetId) continue;
    sum += retired ? o.realCount : o.seedCount + o.realCount;
  }
  return sum;
}

function previewTotalPool(
  options: ItemAnswerOption[],
  legacyPool: ApiMarketPool | null | undefined,
  oneSharePrice: number,
  cost: number,
  retired: boolean,
): number {
  if (retired) {
    return options.reduce((s, o) => s + o.realCount, 0) * oneSharePrice + cost;
  }
  return (legacyPool?.total_pool ?? 0) + cost;
}

function settlementTotalPool(options: ItemAnswerOption[], oneSharePrice: number, cost: number): number {
  const realTotal = options.reduce((s, o) => s + o.realCount, 0);
  return realTotal * oneSharePrice + cost;
}

function parimutuelPayout(
  shares: number,
  totalPool: number,
  cost: number,
  feePercentage: number,
  winShares: number,
): number {
  if (shares <= 0 || totalPool <= 0 || winShares <= 0) return 0;
  let payout = (shares * totalPool * (1 - feePercentage / 100)) / winShares;
  if (payout < cost && feePercentage > 0) {
    payout = (shares * totalPool) / winShares;
  }
  return payout;
}

/** Profit preview — includes seed liquidity while seed odds are active. */
export function previewPayoutIfOptionWins(
  optionId: string,
  shares: number,
  options: ItemAnswerOption[],
  legacyPool: ApiMarketPool | null | undefined,
  oneSharePrice: number,
  feePercentage: number,
): number {
  const option = options.find((o) => o.id === optionId);
  if (!option || shares <= 0 || oneSharePrice <= 0) return 0;

  const threshold = legacyPool?.seed_retirement_threshold ?? 0.8;
  const retired = isSeedRetired(options, threshold);
  const winShares = previewWinningSharesAfterBet(option, shares, retired);
  if (winShares <= 0) return 0;

  const cost = shares * oneSharePrice;
  const totalPool = previewTotalPool(options, legacyPool, oneSharePrice, cost, retired);
  return parimutuelPayout(shares, totalPool, cost, feePercentage, winShares);
}

/** Actual wallet credit at resolution — real bets only (mirrors settlement). */
export function settlementPayoutIfOptionWins(
  optionId: string,
  shares: number,
  options: ItemAnswerOption[],
  oneSharePrice: number,
  feePercentage: number,
): number {
  const option = options.find((o) => o.id === optionId);
  if (!option || shares <= 0 || oneSharePrice <= 0) return 0;

  const winShares = realWinningSharesAfterBet(option, shares);
  if (winShares <= 0) return 0;

  const cost = shares * oneSharePrice;
  const totalPool = settlementTotalPool(options, oneSharePrice, cost);
  return parimutuelPayout(shares, totalPool, cost, feePercentage, winShares);
}

export function wouldRecoverStakeForOption(
  optionId: string,
  shares: number,
  options: ItemAnswerOption[],
  legacyPool: ApiMarketPool | null | undefined,
  oneSharePrice: number,
  feePercentage: number,
): boolean {
  const option = options.find((o) => o.id === optionId);
  if (!option || shares <= 0 || oneSharePrice <= 0) return false;

  const threshold = legacyPool?.seed_retirement_threshold ?? 0.8;
  const retired = isSeedRetired(options, threshold);

  const opposite = otherLiquidity(optionId, options, retired);
  if (opposite <= 0) return false;

  const onSide = retired
    ? realWinningSharesAfterBet(option, shares)
    : previewWinningSharesAfterBet(option, shares, false);
  if (onSide / opposite > MAX_REAL_IMBALANCE_RATIO) return false;

  if (!retired && otherRealLiquidity(optionId, options) === 0) {
    return true;
  }

  const cost = shares * oneSharePrice;
  if (cost <= 0) return false;
  return settlementPayoutIfOptionWins(optionId, shares, options, oneSharePrice, feePercentage) >= cost;
}

export function projectBetProfitForOption(
  optionId: string,
  shares: number,
  options: ItemAnswerOption[],
  legacyPool: ApiMarketPool | null | undefined,
  oneSharePrice: number,
  feePercentage: number,
) {
  const cost = shares * oneSharePrice;
  if (cost <= 0) return { payout: 0, profit: 0, roi: 0 };

  const payout = previewPayoutIfOptionWins(
    optionId,
    shares,
    options,
    legacyPool,
    oneSharePrice,
    feePercentage,
  );
  const profit = payout - cost;
  return { payout, profit, roi: cost > 0 ? profit / cost : 0 };
}

export function activeBetProfitIfOptionWins(
  optionId: string,
  shares: number,
  amountPaid: number,
  options: ItemAnswerOption[],
  legacyPool: ApiMarketPool | null | undefined,
  oneSharePrice: number,
  feePercentage: number,
) {
  const adjusted = options.map((o) =>
    o.id === optionId
      ? {
          ...o,
          realCount: Math.max(0, o.realCount - shares),
        }
      : o,
  );
  const payout = previewPayoutIfOptionWins(
    optionId,
    shares,
    adjusted,
    legacyPool
      ? {
          ...legacyPool,
          total_pool: Math.max(0, legacyPool.total_pool - amountPaid),
        }
      : null,
    oneSharePrice,
    feePercentage,
  );
  return { payout, profit: payout - amountPaid };
}
