import type {
  ApiPaged,
  ApiPaymentMethod,
  ApiWalletFundingRequest,
  CreateWalletFundingPayload,
  WalletFundingStatus,
} from "@/lib/api/types";
import { http, unwrap, type ApiEnvelope } from "./http";

export const WALLET_FUNDING_QUERY_KEY = "wallet-funding-requests";

export const walletFundingApi = {
  /** Super-admin payment methods customers send wallet deposits to. */
  listDepositMethods: () =>
    http
      .get<ApiEnvelope<ApiPaymentMethod[]>>("/wallet-funding-requests/platform-methods")
      .then((r) => unwrap(r.data)),

  create: (body: CreateWalletFundingPayload) =>
    http
      .post<ApiEnvelope<ApiWalletFundingRequest>>("/wallet-funding-requests", body)
      .then((r) => unwrap(r.data)),

  listMine: (params?: { status?: WalletFundingStatus; page?: number; limit?: number }) =>
    http
      .get<ApiEnvelope<ApiPaged<ApiWalletFundingRequest>>>("/wallet-funding-requests/me", {
        params,
      })
      .then((r) => unwrap(r.data)),

  cancel: (id: string) =>
    http
      .post<ApiEnvelope<ApiWalletFundingRequest>>(`/wallet-funding-requests/${id}/cancel`)
      .then((r) => unwrap(r.data)),
};
