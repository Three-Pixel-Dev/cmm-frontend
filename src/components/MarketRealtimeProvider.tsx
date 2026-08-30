import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { gatewayWebSocketUrl, parseWsMessage } from "@/lib/api/ws";
import { mergeMarketGroupIntoCatalog } from "@/lib/markets/map";
import type { MarketGroupCard } from "@/lib/markets/types";
import type { ApiMarketGroup } from "@/types/market-api";
import { MARKETS_CATALOG_KEY } from "@/hooks/useMarkets";

const CHANNEL_MARKET_CREATED = "market.created";

function parseMarketCreatedPayload(payload: string): ApiMarketGroup | null {
  try {
    let data: unknown = JSON.parse(payload);
    if (typeof data === "string") {
      data = JSON.parse(data);
    }
    const root = data as { eventType?: string; market?: ApiMarketGroup };
    if (root.eventType === "market.created" && root.market?.id) {
      return root.market;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function MarketRealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(gatewayWebSocketUrl());
    wsRef.current = ws;

    const applyMarketCreated = (group: ApiMarketGroup) => {
      queryClient.setQueriesData<MarketGroupCard[]>({ queryKey: MARKETS_CATALOG_KEY }, (old) =>
        old ? mergeMarketGroupIntoCatalog(old, group) : mergeMarketGroupIntoCatalog([], group),
      );
      void queryClient.invalidateQueries({ queryKey: MARKETS_CATALOG_KEY });
      toast.info("New market available", { description: group.title_en });
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe", channel: CHANNEL_MARKET_CREATED }));
    };

    ws.onmessage = (ev) => {
      const msg = parseWsMessage(String(ev.data));
      if (!msg || msg.type !== "event" || msg.channel !== CHANNEL_MARKET_CREATED) return;

      const group = parseMarketCreatedPayload(String(msg.payload ?? ""));
      if (group) applyMarketCreated(group);
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [queryClient]);

  return children;
}
