import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebsocketSubscription } from "@/components/WebsocketProvider";
import {
  applyMarketLiveSnapshotToCache,
  applyVirtualPoolUpdateToCache,
  marketLiveChannel,
  marketVirtualPoolChannel,
} from "@/lib/markets/liveSnapshot";

export function useMarketLiveChannel(marketItemIds: string[]) {
  const { subscribe, isReady, resubscribeAll } = useWebsocketSubscription();
  const queryClient = useQueryClient();
  const idsKey = marketItemIds.slice().sort().join(",");

  useEffect(() => {
    if (!isReady) return;
    resubscribeAll();
  }, [isReady, resubscribeAll]);

  useEffect(() => {
    if (!idsKey) return;

    const ids = idsKey.split(",").filter(Boolean);
    const unsubs = ids.flatMap((id) => [
      subscribe(marketLiveChannel(id), (payload) => {
        applyMarketLiveSnapshotToCache(queryClient, payload);
      }),
      subscribe(marketVirtualPoolChannel(id), (payload) => {
        applyVirtualPoolUpdateToCache(queryClient, payload);
      }),
    ]);

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [idsKey, subscribe, queryClient]);
}

export const useMarketPoolRealtime = useMarketLiveChannel;
