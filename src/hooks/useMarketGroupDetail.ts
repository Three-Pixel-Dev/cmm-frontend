import { useQuery } from "@tanstack/react-query";
import {
  loadMarketGroupDetail,
  type MarketDetails,
  type MarketItem,
} from "@/lib/markets/loadMarketGroupDetail";

export const MARKET_GROUP_DETAIL_KEY = "markets-group-detail";

/** Volume chart history — must not share MARKET_GROUP_DETAIL_KEY prefix (WS cache patches match by prefix). */
export const MARKET_VOLUME_HISTORY_KEY = "market-volume-history";

export type { MarketDetails, MarketItem };

export function useMarketGroupDetail(
  marketId: string,
  options?: { refetchInterval?: number | false },
) {
  return useQuery({
    queryKey: [MARKET_GROUP_DETAIL_KEY, marketId],
    enabled: !!marketId,
    queryFn: () => loadMarketGroupDetail(marketId),
    staleTime: 0,
    refetchInterval: options?.refetchInterval ?? false,
    refetchIntervalInBackground: true,
  });
}
