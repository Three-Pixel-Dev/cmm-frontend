import type { ApiPaged, PlaceBetPayload, PlaceBetResult } from "@/lib/api/types";
import { http, unwrap, type ApiEnvelope } from "./http";
import { ApiBettingHistory } from "@/types/bet-api";

export const betsApi = {
  place: (payload: PlaceBetPayload) =>
    http
      .post<ApiEnvelope<PlaceBetResult>>(
        "/bets",
        {
          market_item_id: payload.market_item_id,
          shares: payload.shares,
          ledger: payload.ledger,
          idempotency_key: payload.idempotency_key,
          ...(payload.option_id ? { option_id: payload.option_id } : {}),
          ...(payload.side ? { side: payload.side } : {}),
          ...(payload.referral_code ? { referral_code: payload.referral_code } : {}),
        },
        {
          headers: {
            "X-Idempotency-Key": payload.idempotency_key,
          },
        },
      )
      .then((r) => unwrap(r.data)),
  list: (params?: { page?: number; limit?: number; user_id?: string; market_item_id?: string }) =>
    http
      .get<ApiEnvelope<ApiPaged<ApiBettingHistory>>>("/bets", { params })
      .then((r) => unwrap(r.data)),
};
