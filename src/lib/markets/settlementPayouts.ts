import type { ApiBettingHistory } from "@/types/bet-api";
import type { ApiMarketItem } from "@/types/market-api";
import { isValidBetOptionId, potentialProfitForBet } from "@/lib/markets/bettingHistoryProfit";

/** Mirrors CMM-backend/app/betting-service/internal/pool/settlement.go */
export const WIN_BONUS_PERCENT = 5;

export type SettlementBet = {
  id: string;
  side: string;
  optionId?: string;
  shares: number;
  amount: number;
};

export type BetResult = "won" | "lost" | "refunded" | "pending";

export type BetSettlement = {
  result: BetResult;
  payout: number;
  profit: number;
};

function inferOneSharePrice(oneSharePrice: number, winners: SettlementBet[]): number {
  if (oneSharePrice > 0) return oneSharePrice;
  for (const w of winners) {
    if (w.shares > 0) return Math.trunc(w.amount / w.shares);
  }
  return 0;
}

function bonusPerShare(oneSharePrice: number): number {
  if (oneSharePrice <= 0) return 0;
  return Math.trunc((oneSharePrice * WIN_BONUS_PERCENT) / 100);
}

function winThreshold(amount: number, shares: number, oneSharePrice: number): number {
  return amount + shares * bonusPerShare(oneSharePrice);
}

function minWinnerPoolForBonus(totalWinShares: number, oneSharePrice: number): number {
  if (totalWinShares <= 0 || oneSharePrice <= 0) return 0;
  return totalWinShares * (oneSharePrice + bonusPerShare(oneSharePrice));
}

function winnerPoolAmount(totalPool: number, platformFeePercent: number): number {
  if (totalPool <= 0) return 0;
  const fee = Math.trunc((totalPool * platformFeePercent) / 100);
  return Math.max(0, totalPool - fee);
}

function distributeWinnerPool(
  out: Map<string, number>,
  winners: SettlementBet[],
  winnerPool: number,
  totalWinShares: number,
): void {
  const payoutPerShare = Math.trunc(winnerPool / totalWinShares);
  let remainder = winnerPool - payoutPerShare * totalWinShares;

  for (const w of winners) {
    out.set(w.id, w.shares * payoutPerShare);
  }

  if (remainder <= 0 || winners.length === 0) return;

  const ranked = [...winners].sort((a, b) => {
    if (a.shares !== b.shares) return b.shares - a.shares;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  while (remainder > 0) {
    for (const w of ranked) {
      if (remainder === 0) break;
      out.set(w.id, (out.get(w.id) ?? 0) + 1);
      remainder -= 1;
    }
  }
}

function applyStakeFloors(out: Map<string, number>, winners: SettlementBet[]): void {
  for (const w of winners) {
    const current = out.get(w.id) ?? 0;
    if (current < w.amount) out.set(w.id, w.amount);
  }
}

function anyWinnerUnderWinBonus(
  payouts: Map<string, number>,
  winners: SettlementBet[],
  oneSharePrice: number,
): boolean {
  return winners.some(
    (w) => (payouts.get(w.id) ?? 0) < winThreshold(w.amount, w.shares, oneSharePrice),
  );
}

function feeMeetsWinBonus(
  totalPool: number,
  totalWinShares: number,
  oneSharePrice: number,
  fee: number,
  winners: SettlementBet[],
): boolean {
  if (oneSharePrice <= 0) return true;
  const out = new Map<string, number>();
  for (const w of winners) out.set(w.id, 0);
  distributeWinnerPool(out, winners, winnerPoolAmount(totalPool, fee), totalWinShares);
  return !anyWinnerUnderWinBonus(out, winners, oneSharePrice);
}

function resolveEffectiveFeePercent(
  totalPool: number,
  totalWinShares: number,
  oneSharePrice: number,
  configured: number,
  winners: SettlementBet[],
): number {
  if (oneSharePrice <= 0 || totalWinShares <= 0 || totalPool <= 0) return configured;
  if (minWinnerPoolForBonus(totalWinShares, oneSharePrice) > totalPool) return 0;

  for (let fee = configured; fee >= 0; fee -= 1) {
    if (feeMeetsWinBonus(totalPool, totalWinShares, oneSharePrice, fee, winners)) {
      return fee;
    }
    if (fee === 0) break;
  }
  return 0;
}

function computePayouts(
  bets: SettlementBet[],
  isWinner: (bet: SettlementBet) => boolean,
  platformFeePercent: number,
  oneSharePrice: number,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const b of bets) out.set(b.id, 0);

  const winners = bets.filter(isWinner);
  const totalPool = bets.reduce((sum, b) => sum + b.amount, 0);
  const totalWinShares = winners.reduce((sum, b) => sum + b.shares, 0);
  if (totalWinShares === 0 || totalPool === 0) return out;

  const price = inferOneSharePrice(oneSharePrice, winners);
  const feePercent = resolveEffectiveFeePercent(
    totalPool,
    totalWinShares,
    price,
    platformFeePercent,
    winners,
  );
  distributeWinnerPool(out, winners, winnerPoolAmount(totalPool, feePercent), totalWinShares);
  applyStakeFloors(out, winners);
  return out;
}

/** Same as Go ComputeWinPayouts — proportional share of the real pool, losers get 0. */
export function computeWinPayouts(
  bets: SettlementBet[],
  winningSide: string,
  platformFeePercent: number,
  oneSharePrice = 0,
): Map<string, number> {
  return computePayouts(bets, (b) => b.side === winningSide, platformFeePercent, oneSharePrice);
}

export function computeWinPayoutsByOption(
  bets: SettlementBet[],
  winningOptionId: string,
  platformFeePercent: number,
  oneSharePrice = 0,
): Map<string, number> {
  return computePayouts(
    bets,
    (b) => b.optionId === winningOptionId,
    platformFeePercent,
    oneSharePrice,
  );
}

export function computeRefunds(bets: SettlementBet[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const b of bets) out.set(b.id, b.amount);
  return out;
}

function toSettlementBet(bet: ApiBettingHistory): SettlementBet {
  return {
    id: bet.id,
    side: bet.side,
    optionId: isValidBetOptionId(bet.option_id) ? bet.option_id : undefined,
    shares: bet.shares,
    amount: bet.amount,
  };
}

export function settleRoundBets(
  bets: ApiBettingHistory[],
  item: ApiMarketItem,
): Map<string, BetSettlement> {
  const rows = bets.map(toSettlementBet);
  const out = new Map<string, BetSettlement>();

  if (item.status === "cancelled" || item.status === "voided" || item.outcome === "void") {
    for (const b of rows) {
      out.set(b.id, { result: "refunded", payout: b.amount, profit: 0 });
    }
    return out;
  }

  if (item.status === "settled") {
    const winningOptionId = item.winning_option_id ?? "";
    const useOption = isValidBetOptionId(winningOptionId);
    const winningSide = item.outcome === "no" ? "no" : "yes";

    const payouts = useOption
      ? computeWinPayoutsByOption(
          rows,
          winningOptionId,
          item.platform_fee_percentage,
          item.one_share_price,
        )
      : computeWinPayouts(
          rows,
          winningSide,
          item.platform_fee_percentage,
          item.one_share_price,
        );

    for (const b of rows) {
      const payout = payouts.get(b.id) ?? 0;
      const won = useOption ? b.optionId === winningOptionId : b.side === winningSide;
      out.set(b.id, {
        result: won ? "won" : "lost",
        payout,
        profit: payout - b.amount,
      });
    }
    return out;
  }

  for (const bet of bets) {
    const profit = potentialProfitForBet(bet, item);
    out.set(bet.id, {
      result: "pending",
      payout: profit == null ? 0 : bet.amount + profit,
      profit: profit ?? 0,
    });
  }
  return out;
}
