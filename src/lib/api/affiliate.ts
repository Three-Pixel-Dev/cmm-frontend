import { http, unwrap, type ApiEnvelope } from "./http";

export const AFFILIATE_EARNINGS_QUERY_KEY = "affiliate-earnings";

export type ApiAffiliateEarning = {
  id: string;
  betting_history_id: string;
  market_id: string;
  market_title_en: string;
  market_item_id: string;
  market_item_title_en: string;
  bet_side: "yes" | "no" | string;
  bet_amount: number;
  payout_amount: number;
  ledger: "real" | "virtual";
  created_at: string;
};

export type ApiAffiliateEarningsList = {
  items: ApiAffiliateEarning[];
  total: number;
  page: number;
  limit: number;
  total_earned: number;
};

export const affiliateApi = {
  listMyEarnings: (params?: { page?: number; limit?: number }) =>
    http
      .get<ApiEnvelope<ApiAffiliateEarningsList>>("/bets/affiliate-earnings", { params })
      .then((r) => unwrap(r.data)),
};
