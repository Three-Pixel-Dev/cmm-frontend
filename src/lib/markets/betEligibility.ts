import type { ApiMarketPool } from "@/types/market-api";

export const MAX_REAL_IMBALANCE_RATIO = 2;

export type PoolEligibilityState = {
  realYesShares: number;
  realNoShares: number;
  totalPoolMoney: number;
  seedYesCount?: number;
  seedNoCount?: number;
  seedRetirementThreshold?: number;
};

function isSeedRetired(pool: PoolEligibilityState): boolean {
  const seedYes = pool.seedYesCount ?? 0;
  const seedNo = pool.seedNoCount ?? 0;
  const seedTotal = seedYes + seedNo;
  if (seedTotal <= 0) return true;

  const realTotal = pool.realYesShares + pool.realNoShares;
  if (realTotal <= 0) return false;

  const threshold =
    pool.seedRetirementThreshold && pool.seedRetirementThreshold > 0
      ? pool.seedRetirementThreshold
      : 0.8;
  return realTotal / seedTotal >= threshold;
}

function realWinningSharesAfterBet(
  side: "yes" | "no",
  shares: number,
  pool: PoolEligibilityState,
): number {
  return side === "yes" ? pool.realYesShares + shares : pool.realNoShares + shares;
}

function previewWinningSharesAfterBet(
  side: "yes" | "no",
  shares: number,
  pool: PoolEligibilityState,
): number {
  if (isSeedRetired(pool)) {
    return realWinningSharesAfterBet(side, shares, pool);
  }
  const seedYes = pool.seedYesCount ?? 0;
  const seedNo = pool.seedNoCount ?? 0;
  return side === "yes"
    ? seedYes + pool.realYesShares + shares
    : seedNo + pool.realNoShares + shares;
}

function previewTotalPool(
  pool: PoolEligibilityState,
  oneSharePrice: number,
  cost: number,
): number {
  if (isSeedRetired(pool)) {
    return (pool.realYesShares + pool.realNoShares) * oneSharePrice + cost;
  }
  return pool.totalPoolMoney + cost;
}

function settlementTotalPool(
  pool: PoolEligibilityState,
  oneSharePrice: number,
  cost: number,
): number {
  return (pool.realYesShares + pool.realNoShares) * oneSharePrice + cost;
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

function oppositeSideLiquidity(side: "yes" | "no", pool: PoolEligibilityState): number {
  if (isSeedRetired(pool)) {
    return side === "yes" ? pool.realNoShares : pool.realYesShares;
  }
  const seedYes = pool.seedYesCount ?? 0;
  const seedNo = pool.seedNoCount ?? 0;
  return side === "yes" ? seedNo + pool.realNoShares : seedYes + pool.realYesShares;
}

function oppositeRealLiquidity(side: "yes" | "no", pool: PoolEligibilityState): number {
  return side === "yes" ? pool.realNoShares : pool.realYesShares;
}

function exceedsRealImbalance(
  side: "yes" | "no",
  shares: number,
  pool: PoolEligibilityState,
): boolean {
  const opposite = oppositeSideLiquidity(side, pool);
  if (opposite <= 0) return true;

  const onSide = isSeedRetired(pool)
    ? realWinningSharesAfterBet(side, shares, pool)
    : previewWinningSharesAfterBet(side, shares, pool);
  return onSide / opposite > MAX_REAL_IMBALANCE_RATIO;
}

/** Profit preview — includes seed liquidity while seed odds are active. */
export function previewPayoutIfSideWins(
  side: "yes" | "no",
  shares: number,
  pool: PoolEligibilityState,
  oneSharePrice: number,
  feePercentage: number,
): number {
  if (shares <= 0 || oneSharePrice <= 0) return 0;

  const winShares = previewWinningSharesAfterBet(side, shares, pool);
  if (winShares <= 0) return 0;

  const cost = shares * oneSharePrice;
  const totalPool = previewTotalPool(pool, oneSharePrice, cost);
  return parimutuelPayout(shares, totalPool, cost, feePercentage, winShares);
}

/** Actual wallet credit at resolution — real bets only (mirrors settlement). */
export function settlementPayoutIfSideWins(
  side: "yes" | "no",
  shares: number,
  pool: PoolEligibilityState,
  oneSharePrice: number,
  feePercentage: number,
): number {
  if (shares <= 0 || oneSharePrice <= 0) return 0;

  const winShares = realWinningSharesAfterBet(side, shares, pool);
  if (winShares <= 0) return 0;

  const cost = shares * oneSharePrice;
  const totalPool = settlementTotalPool(pool, oneSharePrice, cost);
  return parimutuelPayout(shares, totalPool, cost, feePercentage, winShares);
}

export function wouldRecoverStake(
  side: "yes" | "no",
  shares: number,
  pool: PoolEligibilityState,
  oneSharePrice: number,
  feePercentage: number,
): boolean {
  if (exceedsRealImbalance(side, shares, pool)) return false;

  if (!isSeedRetired(pool) && oppositeRealLiquidity(side, pool) === 0) {
    return true;
  }

  const cost = shares * oneSharePrice;
  if (cost <= 0) return false;
  return settlementPayoutIfSideWins(side, shares, pool, oneSharePrice, feePercentage) >= cost;
}

export function poolEligibilityFromApi(pool: ApiMarketPool | null | undefined): PoolEligibilityState {
  return {
    realYesShares: pool?.real_yes_count ?? 0,
    realNoShares: pool?.real_no_count ?? 0,
    totalPoolMoney: pool?.total_pool ?? 0,
    seedYesCount: pool?.seed_yes_count ?? 0,
    seedNoCount: pool?.seed_no_count ?? 0,
    seedRetirementThreshold: pool?.seed_retirement_threshold ?? 0.8,
  };
}

export function projectBetProfit(
  side: "yes" | "no",
  shares: number,
  pool: PoolEligibilityState,
  oneSharePrice: number,
  feePercentage: number,
) {
  const cost = shares * oneSharePrice;
  const payout = previewPayoutIfSideWins(side, shares, pool, oneSharePrice, feePercentage);
  const profit = payout - cost;
  return {
    payout,
    profit,
    roi: cost > 0 ? profit / cost : 0,
  };
}

/** Profit if an already-placed active bet wins, using current pool state. */
export function activeBetProfitIfWins(
  side: "yes" | "no",
  shares: number,
  amountPaid: number,
  pool: PoolEligibilityState,
  oneSharePrice: number,
  feePercentage: number,
) {
  if (shares <= 0 || amountPaid <= 0 || oneSharePrice <= 0) {
    return { payout: 0, profit: 0 };
  }

  const adjusted: PoolEligibilityState = {
    ...pool,
    realYesShares:
      side === "yes" ? Math.max(0, pool.realYesShares - shares) : pool.realYesShares,
    realNoShares: side === "no" ? Math.max(0, pool.realNoShares - shares) : pool.realNoShares,
    totalPoolMoney: Math.max(0, pool.totalPoolMoney - amountPaid),
  };

  const payout = previewPayoutIfSideWins(side, shares, adjusted, oneSharePrice, feePercentage);
  const profit = payout - amountPaid;
  return { payout, profit };
}
