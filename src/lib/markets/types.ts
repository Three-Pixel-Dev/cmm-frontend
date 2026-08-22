import type { Bilingual, MarketOutcome } from "@/data/markets";
import type { ApiMarketItemOption, ApiMarketOutcome, ApiMarketPool } from "@/types/market-api";

export type MarketItemRow = {
  id: string;
  slug: string;
  title: Bilingual;
  yesPrice: number;
  volume: number;
  endDate: string;
  status?: string;
  resolvedOutcome?: MarketOutcome;
  outcome?: ApiMarketOutcome | null;
  winning_option_id?: string | null;
  options?: ApiMarketItemOption[];
  real_pool?: ApiMarketPool | null;
};

/** Full item row for detail (market_items + market_pools_real). */
export type MarketItemDetail = MarketItemRow & {
  oneSharePrice: number;
  platformFeePercentage: number;
  description: Bilingual;
  pool: ApiMarketPool | null;
  participants: number;
};

export type MarketGroupDetail = {
  group: MarketGroupCard;
  items: MarketItemDetail[];
};

/** One card = market group (Polymarket-style) with multiple yes/no items. */
export type MarketGroupCard = {
  id: string;
  title: Bilingual;
  description: Bilingual;
  pictureUrl: string;
  icon: string;
  categoryId: string;
  categorySlug: string;
  categoryTitle: Bilingual;
  affiliateRatePercent: number;
  isBanner: boolean;
  items: MarketItemRow[];
  totalVolume: number;
  /** Latest close time among items (for sorting / badges). */
  endDate: string;
};
