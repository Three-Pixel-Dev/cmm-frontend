import { useQuery } from "@tanstack/react-query";
import { walletApi, WALLET_QUERY_KEY } from "@/lib/api/wallet";

export function useWallet(userId: string | undefined) {
  return useQuery({
    queryKey: [WALLET_QUERY_KEY, userId],
    queryFn: () => walletApi.getMine(),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function parseWalletAmount(raw: string | undefined): number {
  if (!raw) return 0;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}
