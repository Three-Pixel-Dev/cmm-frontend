import { useQuery } from "@tanstack/react-query";
import { marketItemsApi, marketsApi } from "@/lib/api/markets";
import { mapMarketItemToDisplay } from "@/lib/markets/map";

async function resolveMarketItem(itemId: string) {
  const item = await marketItemsApi.get(itemId);
  const parent = await marketsApi.get(item.market_id);
  return mapMarketItemToDisplay(item, parent);
}

export function useMarket(itemId: string) {
  return useQuery({
    queryKey: ["markets", "item", itemId],
    enabled: !!itemId,
    queryFn: () => resolveMarketItem(itemId),
    staleTime: 15_000,
  });
}

export const MARKETS_CATALOG_KEY = ["markets", "catalog"] as const;
