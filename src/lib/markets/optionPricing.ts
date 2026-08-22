import type { ApiMarketPool } from "@/types/market-api";
import type { ItemAnswerOption } from "@/lib/markets/marketItemOptions";

function seedRetirementThreshold(legacyPool?: ApiMarketPool | null): number {
  return legacyPool?.seed_retirement_threshold ?? 0.8;
}

export function isOptionSeedRetired(
  options: ItemAnswerOption[],
  legacyPool?: ApiMarketPool | null,
): boolean {
  const seedTotal = options.reduce((s, o) => s + o.seedCount, 0);
  const realTotal = options.reduce((s, o) => s + o.realCount, 0);
  if (seedTotal <= 0) return true;
  if (realTotal <= 0) return false;
  const t = seedRetirementThreshold(legacyPool);
  return realTotal / seedTotal >= t;
}

/** Shares that drive implied odds (seed counts while seed is active; real-only after retirement). */
export function optionEffectiveShares(
  option: ItemAnswerOption,
  options: ItemAnswerOption[],
  legacyPool?: ApiMarketPool | null,
): number {
  const retired = isOptionSeedRetired(options, legacyPool);
  return retired ? option.realCount : option.seedCount + option.realCount;
}

export function totalOptionEffectiveShares(
  options: ItemAnswerOption[],
  legacyPool?: ApiMarketPool | null,
): number {
  return options.reduce((sum, o) => sum + optionEffectiveShares(o, options, legacyPool), 0);
}

/** Bettor stake only (real shares × price) — excludes platform seed liquidity. */
export function realPoolMoney(
  options: ItemAnswerOption[],
  legacyPool: ApiMarketPool | null | undefined,
  oneSharePrice: number,
): number {
  if (options.length > 0) {
    const realShares = options.reduce((sum, o) => sum + o.realCount, 0);
    return realShares * oneSharePrice;
  }
  if (!legacyPool) return 0;
  return (legacyPool.real_yes_count + legacyPool.real_no_count) * oneSharePrice;
}

/** Money in the pool from real bettors (display / volume totals). */
export function activePoolMoney(
  options: ItemAnswerOption[],
  legacyPool: ApiMarketPool | null | undefined,
  oneSharePrice: number,
): number {
  return realPoolMoney(options, legacyPool, oneSharePrice);
}

function effectiveShares(option: ItemAnswerOption, retired: boolean): number {
  return retired ? option.realCount : option.seedCount + option.realCount;
}

/** Implied win chance (0–1) for one answer from option pool counters. */
export function optionImpliedChance(
  option: ItemAnswerOption,
  options: ItemAnswerOption[],
  legacyPool?: ApiMarketPool | null,
): number {
  if (options.length === 0) return 0.5;
  const retired = isOptionSeedRetired(options, legacyPool);
  const total = options.reduce((s, o) => s + effectiveShares(o, retired), 0);
  if (total <= 0) return 1 / options.length;
  return effectiveShares(option, retired) / total;
}

export function optionImpliedPercent(
  option: ItemAnswerOption,
  options: ItemAnswerOption[],
  legacyPool?: ApiMarketPool | null,
): number {
  return optionImpliedChance(option, options, legacyPool) * 100;
}

/** Highest implied-chance answer (for compact list rows). */
export function leadingOptionPercent(
  options: ItemAnswerOption[],
  legacyPool?: ApiMarketPool | null,
): { option: ItemAnswerOption; pct: number } | null {
  if (options.length === 0) return null;
  let best = options[0];
  let bestPct = optionImpliedPercent(best, options, legacyPool);
  for (const opt of options.slice(1)) {
    const pct = optionImpliedPercent(opt, options, legacyPool);
    if (pct > bestPct) {
      best = opt;
      bestPct = pct;
    }
  }
  return { option: best, pct: bestPct };
}
