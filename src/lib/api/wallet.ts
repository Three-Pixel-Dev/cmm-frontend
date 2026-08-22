import type { ApiWallet } from "@/lib/api/types";
import { http, unwrap, type ApiEnvelope } from "./http";

/** Shared React Query key — must match useWallet / useWalletRealtime. */
export const WALLET_QUERY_KEY = "wallet";

export const walletApi = {
  getMine: () =>
    http.get<ApiEnvelope<ApiWallet>>("/wallets/me").then((r) => unwrap(r.data)),
};
