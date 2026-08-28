import type {
  ApiMarketGroup,
  ApiMarketItem,
  ApiMarketCategory,
  ApiPaged,
} from "@/types/market-api";
import type {
  VolumeHistoryResponse,
  VolumeLedger,
  VolumeHistoryRange,
} from "@/lib/markets/volumeShare";
import { http, unwrap, type ApiEnvelope } from "./http";

export type MarketListParams = {
  search?: string;
  page?: number;
  limit?: number;
  banner?: boolean;
  category_id?: string;
  sort?: "created" | "volume";
  closing_soon?: boolean;
};

export const marketCategoriesApi = {
  list: () =>
    http.get<ApiEnvelope<ApiMarketCategory[]>>("/market-categories").then((r) => unwrap(r.data)),
};

export const marketsApi = {
  list: (params?: MarketListParams) =>
    http
      .get<ApiEnvelope<ApiPaged<ApiMarketGroup>>>("/markets", { params })
      .then((r) => unwrap(r.data)),

  get: (id: string) =>
    http.get<ApiEnvelope<ApiMarketGroup>>(`/markets/${id}`).then((r) => unwrap(r.data)),

  getVolumeHistory: (id: string, params: { ledger?: VolumeLedger; range?: VolumeHistoryRange }) =>
    http
      .get<ApiEnvelope<VolumeHistoryResponse>>(`/markets/${id}/volume-history`, { params })
      .then((r) => unwrap(r.data)),
};

export const marketItemsApi = {
  get: (id: string) =>
    http.get<ApiEnvelope<ApiMarketItem>>(`/market-items/${id}`).then((r) => unwrap(r.data)),
  update: (
    id: string,
    body: {
      title_en?: string;
      resolution_criteria_en?: string;
      options?: Array<{ id?: string; title_en: string; title_my?: string; sort_order?: number }>;
    },
  ) =>
    http.patch<ApiEnvelope<ApiMarketItem>>(`/market-items/${id}`, body).then((r) => unwrap(r.data)),
  resolve: (id: string, body: { outcome?: "yes" | "no" | "void"; winning_option_id?: string }) =>
    http
      .post<ApiEnvelope<ApiMarketItem>>(`/market-items/resolve/${id}`, body)
      .then((r) => unwrap(r.data)),
  cancel: (id: string) =>
    http.post<ApiEnvelope<ApiMarketItem>>(`/market-items/cancel/${id}`).then((r) => unwrap(r.data)),
};

// ─── Banners ────────────────────────────────────────────────────────────────

export interface ApiBanner {
  id: string;
  image_url: string;
  link_url: string;
  /** 'messenger' = external link opened in new tab; 'market' = in-app navigation */
  link_type: "messenger" | "market";
  sort_order: number;
  is_active: boolean;
}

export const bannersApi = {
  /** Fetches only active banners (sorted by sort_order). */
  listActive: () =>
    http
      .get<ApiEnvelope<ApiBanner[]>>("/banners", { params: { active: true } })
      .then((r) => unwrap(r.data)),
};
