import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebsocketSubscription } from "@/components/WebsocketProvider";
import { WALLET_QUERY_KEY } from "@/lib/api/wallet";
import type { ApiWallet } from "@/lib/api/types";
import { useAuth } from "@/store/useAuth";

function parseWalletUpdated(payload: unknown): Pick<ApiWallet, "amount" | "virtual_amount"> | null {
  let data: unknown = payload;
  if (typeof payload === "string") {
    try {
      data = JSON.parse(payload);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (obj.eventType !== "wallet.updated") return null;
  if (typeof obj.amount !== "string" || typeof obj.virtual_amount !== "string") return null;
  return { amount: obj.amount, virtual_amount: obj.virtual_amount };
}

export function useWalletRealtime(userId: string | undefined) {
  const { subscribe } = useWebsocketSubscription();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = `user.${userId}.wallet.updated`;
    return subscribe(channel, (payload) => {
      const update = parseWalletUpdated(payload);
      if (!update) return;

      queryClient.setQueryData<ApiWallet>([WALLET_QUERY_KEY, userId], (old) =>
        old ? { ...old, amount: update.amount, virtual_amount: update.virtual_amount } : old,
      );
    });
  }, [userId, subscribe, queryClient]);
}

/** Mount in app root to keep wallet balance live after bets. */
export function WalletRealtimeListener() {
  const userId = useAuth((s) => s.user?.id);
  useWalletRealtime(userId);
  return null;
}
