import { useMutation } from "@tanstack/react-query";
import { betsApi } from "@/lib/api/bets";
import type { PlaceBetPayload } from "@/lib/api/types";
import { getReferralCodeForBet } from "@/hooks/useReferralAttribution";

/** Place bet — pool updates from HTTP `live` snapshot + WS `market.{id}.live`. */
export function usePlaceBet(marketId?: string) {
  return useMutation({
    mutationFn: (payload: PlaceBetPayload) => {
      const referral_code = marketId ? getReferralCodeForBet(marketId) : payload.referral_code;
      return betsApi.place({
        ...payload,
        ...(referral_code ? { referral_code } : {}),
      });
    },
  });
}
