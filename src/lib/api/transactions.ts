import type { ApiPaged, ApiTransaction } from "@/lib/api/types";
import { useAuth } from "@/store/useAuth";
import { http, unwrap, type ApiEnvelope } from "./http";

/** Shared React Query key for a user's real-ledger transactions. */
export const TRANSACTIONS_QUERY_KEY = "transactions";

export const transactionsApi = {
  listByUser: (userId: string, params?: { page?: number; limit?: number }) =>
    http
      .get<ApiEnvelope<ApiPaged<ApiTransaction>>>(`/transactions/by-user/${userId}`, { params })
      .then((r) => unwrap(r.data)),

  listMine: (params?: { page?: number; limit?: number }) => {
    const userId = useAuth.getState().user?.id;
    if (!userId) {
      return Promise.reject(new Error("Not logged in"));
    }
    return transactionsApi.listByUser(userId, params);
  },
};
