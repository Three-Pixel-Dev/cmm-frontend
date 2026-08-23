import type { Bilingual } from "@/data/markets";
import type { ApiMarketGroup } from "@/types/market-api";
import { marketsApi } from "@/lib/api/markets";
import { fetchMarketGroup } from "@/lib/api/serverFetch";
import {
  ApiMarketItemOption,
  ApiMarketOutcome,
  ApiMarketPool,
  ApiMarketStatus,
} from "@/types/market-api";

export type MarketItemOption = ApiMarketItemOption;

export type MarketItem = {
  id: string;
  slug: string;
  title: Bilingual;
  description: Bilingual;
  start_time: string;
  close_time: string;
  resolution_time: string;
  resolved_time: string | null;
  status: ApiMarketStatus;
  outcome: ApiMarketOutcome | null;
  winning_option_id?: string | null;
  one_share_price: number;
  platform_fee_percentage: number;
  real_pool: ApiMarketPool | null;
  virtual_pool?: ApiMarketPool | null;
  options?: MarketItemOption[];
};

export type MarketDetails = {
  id: string;
  title: Bilingual;
  description: Bilingual;
  pictureUrl: string;
  categoryId: string;
  categorySlug: string;
  icon: string;
  affiliateRatePercent: number;
  items: MarketItem[];
};

function pickIcon(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("btc") || t.includes("bitcoin") || t.includes("crypto") || t.includes("eth"))
    return "₿";
  if (
    t.includes("election") ||
    t.includes("president") ||
    t.includes("vote") ||
    t.includes("trump")
  )
    return "🗳️";
  if (t.includes("gta") || t.includes("game")) return "🎮";
  if (t.includes("iphone") || t.includes("apple")) return "📱";
  if (t.includes("cup") || t.includes("league") || t.includes("nba") || t.includes("sport"))
    return "⚽";
  if (t.includes("fed") || t.includes("rate") || t.includes("gdp") || t.includes("economy"))
    return "📈";
  return "📊";
}

export async function loadMarketGroupDetail(marketId: string): Promise<MarketDetails> {
  let market: ApiMarketGroup | null = null;

  if (typeof window !== "undefined") {
    try {
      market = await marketsApi.get(marketId);
    } catch {
      market = null;
    }
  } else {
    market = await fetchMarketGroup(marketId);
  }

  if (!market) {
    throw new Error("Market not found");
  }

  return {
    id: market.id,
    title: {
      en: market.title_en,
      my: market.title_my ? market.title_my : market.title_en,
    },
    description: {
      en: market.description_en,
      my: market.description_my ? market.description_my : market.description_en,
    },
    pictureUrl: market.picture_url,
    categoryId: market.category_id,
    categorySlug: market.category?.slug ?? "general",
    icon: pickIcon(market.title_en),
    affiliateRatePercent: market.affiliate_rate_percent ?? 0,
    items:
      market.market_items?.map((i) => ({
        id: i.id,
        slug: i.slug,
        title: {
          en: i.title_en,
          my: i.title_my ? i.title_my : i.title_en,
        },
        description: {
          en: i.resolution_criteria_en,
          my: i.resolution_criteria_my ? i.resolution_criteria_my : i.resolution_criteria_en,
        },
        start_time: i.start_time,
        close_time: i.close_time,
        resolution_time: i.resolution_time,
        resolved_time: i.resolved_time,
        status: i.status,
        outcome: i.outcome,
        winning_option_id: i.winning_option_id,
        one_share_price: i.one_share_price,
        platform_fee_percentage: i.platform_fee_percentage,
        real_pool: i.real_pool || null,
        virtual_pool: i.virtual_pool || null,
        options: i.options,
      })) ?? [],
  };
}
