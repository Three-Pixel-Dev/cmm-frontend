export type ApiMarketCategory = {
  id: string;
  slug: string;
  title_en: string;
  title_my: string;
  sort_order?: number;
  is_enable?: boolean;
};

export type ApiMarketCategoryBrief = {
  id: string;
  slug: string;
  title_en: string;
  title_my: string;
};

export type ApiMarketStatus = "draft" | "open" | "closed" | "settled" | "cancelled" | "voided";
export type ApiMarketOutcome = "yes" | "no" | "void";

export type ApiMarketOptionPool = {
  seed_count: number;
  real_count: number;
};

export type ApiMarketItemOption = {
  id: string;
  title_en: string;
  title_my: string;
  sort_order: number;
  real_pool?: ApiMarketOptionPool;
  virtual_pool?: ApiMarketOptionPool;
};

export type ApiMarketPool = {
  seed_retirement_threshold: number;
  seed_yes_count: number;
  seed_no_count: number;
  real_yes_count: number;
  real_no_count: number;
  total_pool: number;
};

export type ApiMarketItem = {
  id: string;
  market_id: string;
  slug: string;
  title_en: string;
  title_my: string;
  resolution_criteria_en: string;
  resolution_criteria_my: string;
  start_time: string;
  close_time: string;
  resolution_time: string;
  resolved_time: string | null;
  status: ApiMarketStatus;
  outcome: ApiMarketOutcome | null;
  winning_option_id?: string | null;
  one_share_price: number;
  platform_fee_percentage: number;
  stake_mode?: "prepaid" | "pay_after";
  real_pool?: ApiMarketPool;
  virtual_pool?: ApiMarketPool;
  options?: ApiMarketItemOption[];
};

export type ApiMarketGroup = {
  id: string;
  category_id: string;
  category?: ApiMarketCategoryBrief;
  title_en: string;
  title_my: string;
  description_en: string;
  description_my: string;
  picture_url: string;
  room_id?: string;
  affiliate_rate_percent?: number;
  is_banner?: boolean;
  market_items?: ApiMarketItem[];
};

export type ApiPageMeta = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type ApiPaged<T> = {
  items: T[];
  meta: ApiPageMeta;
};
