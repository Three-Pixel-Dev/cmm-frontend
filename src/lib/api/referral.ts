import { http, unwrap, type ApiEnvelope } from "./http";

export type ReferralLink = {
  code: string;
  url: string;
  affiliate_rate_percent: number;
  click_count: number;
  conversion_count: number;
  total_earnings?: number;
};

export type ReferralAttribution = {
  code: string;
  market_id: string;
  affiliate_rate_percent: number;
  referrer_user_id: string;
};

export const referralApi = {
  createOrGetLink: (marketId: string) =>
    http
      .post<ApiEnvelope<ReferralLink>>(`/markets/${marketId}/referral-links`)
      .then((r) => unwrap(r.data)),

  getMyLink: (marketId: string) =>
    http
      .get<ApiEnvelope<ReferralLink>>(`/markets/${marketId}/referral-links/me`)
      .then((r) => unwrap(r.data)),

  resolve: (ref: string) =>
    http
      .get<
        ApiEnvelope<{ market_id: string; affiliate_rate_percent: number; code: string }>
      >("/referral/resolve", { params: { ref } })
      .then((r) => unwrap(r.data)),

  recordClick: (body: { code: string; market_id: string }) =>
    http
      .post<ApiEnvelope<ReferralAttribution | { skipped: true }>>("/referral/clicks", body)
      .then((r) => unwrap(r.data)),
};
