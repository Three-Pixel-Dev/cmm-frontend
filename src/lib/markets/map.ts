import type { Market, MarketOutcome } from "@/data/markets";
import type {
  ApiMarketGroup,
  ApiMarketItem,
  ApiMarketPool,
  ApiMarketStatus,
} from "@/types/market-api";
import type {
  MarketGroupCard,
  MarketGroupDetail,
  MarketItemDetail,
  MarketItemRow,
} from "@/lib/markets/types";
import { getItemAnswerOptions } from "@/lib/markets/marketItemOptions";
import { realPoolMoney } from "@/lib/markets/optionPricing";

const CUSTOMER_VISIBLE: ApiMarketStatus[] = ["open", "closed", "settled", "cancelled", "voided"];

export function isCustomerVisibleStatus(status: ApiMarketStatus): boolean {
  return CUSTOMER_VISIBLE.includes(status);
}

function clampYesPrice(v: number): number {
  return Math.max(0.02, Math.min(0.98, v));
}

export type PoolPricingInfo = {
  yesPrice: number;
  seedRetired: boolean;
  effectiveYesShares: number;
  effectiveNoShares: number;
};

export function poolPricingInfo(pool?: ApiMarketPool | null): PoolPricingInfo {
  if (!pool) {
    return { yesPrice: 0.5, seedRetired: false, effectiveYesShares: 0, effectiveNoShares: 0 };
  }

  const realTotal = pool.real_yes_count + pool.real_no_count;
  const seedTotal = pool.seed_yes_count + pool.seed_no_count;
  const grandTotal = realTotal + seedTotal;
  const threshold = pool.seed_retirement_threshold > 0 ? pool.seed_retirement_threshold : 0.8;

  if (realTotal <= 0 && seedTotal <= 0) {
    return { yesPrice: 0.5, seedRetired: false, effectiveYesShares: 0, effectiveNoShares: 0 };
  }

  if (seedTotal <= 0) {
    if (realTotal <= 0) {
      return { yesPrice: 0.5, seedRetired: true, effectiveYesShares: 0, effectiveNoShares: 0 };
    }
    return {
      yesPrice: clampYesPrice(pool.real_yes_count / realTotal),
      seedRetired: true,
      effectiveYesShares: pool.real_yes_count,
      effectiveNoShares: pool.real_no_count,
    };
  }

  const seedRetired = realTotal > 0 && realTotal / seedTotal >= threshold;

  if (seedRetired) {
    return {
      yesPrice: clampYesPrice(pool.real_yes_count / realTotal),
      seedRetired: true,
      effectiveYesShares: pool.real_yes_count,
      effectiveNoShares: pool.real_no_count,
    };
  }

  return {
    yesPrice: clampYesPrice((pool.real_yes_count + pool.seed_yes_count) / grandTotal),
    seedRetired: false,
    effectiveYesShares: pool.real_yes_count + pool.seed_yes_count,
    effectiveNoShares: pool.real_no_count + pool.seed_no_count,
  };
}

export function poolYesPrice(pool?: ApiMarketPool | null): number {
  return poolPricingInfo(pool).yesPrice;
}

export function participantsFromPool(pool?: ApiMarketPool | null): number {
  if (!pool) return 0;
  return pool.real_yes_count + pool.real_no_count + pool.seed_yes_count + pool.seed_no_count;
}

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

function buildHistory(yesPrice: number, points = 40): { t: string; p: number }[] {
  const now = Date.now();
  const day = 86400000;
  return Array.from({ length: points }, (_, i) => ({
    t: new Date(now - (points - 1 - i) * (day / points)).toISOString(),
    p: yesPrice,
  }));
}

function mapOutcome(outcome: ApiMarketItem["outcome"]): MarketOutcome | undefined {
  if (outcome === "yes" || outcome === "no") return outcome;
  return undefined;
}

function categoryFromGroup(group: Pick<ApiMarketGroup, "category_id" | "category">) {
  const c = group.category;
  return {
    categoryId: group.category_id,
    categorySlug: c?.slug ?? "general",
    categoryTitle: {
      en: c?.title_en ?? "General",
      my: c?.title_my || c?.title_en || "General",
    },
  };
}

function itemRealPoolVolume(item: ApiMarketItem): number {
  const options = getItemAnswerOptions(
    {
      id: item.id,
      options: item.options,
      real_pool: item.real_pool ?? null,
      virtual_pool: item.virtual_pool ?? null,
    },
    "real",
    "en",
  );
  return realPoolMoney(options, item.real_pool, item.one_share_price);
}

function mapItemRow(
  item: ApiMarketItem,
  group: Pick<ApiMarketGroup, "id" | "description_en" | "description_my">,
): MarketItemRow {
  return mapItemDetail(item, group);
}

export function mapItemDetail(
  item: ApiMarketItem,
  group: Pick<ApiMarketGroup, "id" | "description_en" | "description_my">,
): MarketItemDetail {
  const pool = item.real_pool ?? null;
  const yesPrice = poolYesPrice(pool);
  return {
    id: item.id,
    slug: item.slug,
    title: { en: item.title_en, my: item.title_my || item.title_en },
    yesPrice,
    volume: itemRealPoolVolume(item),
    endDate: item.close_time,
    status: item.status,
    resolvedOutcome: mapOutcome(item.outcome),
    outcome: item.outcome,
    winning_option_id: item.winning_option_id,
    options: item.options,
    real_pool: pool,
    oneSharePrice: item.one_share_price,
    platformFeePercentage: item.platform_fee_percentage,
    description: {
      en: item.resolution_criteria_en || group.description_en,
      my: item.resolution_criteria_my || group.description_my || item.resolution_criteria_en,
    },
    pool,
    participants: participantsFromPool(pool),
  };
}

export function mapApiGroupToDetail(group: ApiMarketGroup): MarketGroupDetail | null {
  const card = mapApiGroupToCard(group);
  if (!card) return null;

  const items: MarketItemDetail[] = [];
  for (const item of group.market_items ?? []) {
    if (item.status === "draft") continue;
    if (!isCustomerVisibleStatus(item.status)) continue;
    items.push(mapItemDetail(item, group));
  }
  if (items.length === 0) return null;

  return { group: { ...card, items: items.map(stripDetailToRow) }, items };
}

function stripDetailToRow(d: MarketItemDetail): MarketItemRow {
  return {
    id: d.id,
    slug: d.slug,
    title: d.title,
    yesPrice: d.yesPrice,
    volume: d.volume,
    endDate: d.endDate,
    status: d.status,
    resolvedOutcome: d.resolvedOutcome,
    outcome: d.outcome,
    winning_option_id: d.winning_option_id,
    options: d.options,
    real_pool: d.pool,
  };
}

export function mapMarketItemToDisplay(
  item: ApiMarketItem,
  group: Pick<
    ApiMarketGroup,
    "id" | "description_en" | "description_my" | "title_en" | "title_my" | "picture_url"
  >,
): Market {
  const pool = item.real_pool;
  const yesPrice = poolYesPrice(pool);
  const volume = itemRealPoolVolume(item);
  const cat = categoryFromGroup(group as ApiMarketGroup);

  return {
    id: item.id,
    slug: item.slug,
    marketGroupId: group.id,
    groupTitle: { en: group.title_en, my: group.title_my || group.title_en },
    title: { en: item.title_en, my: item.title_my || item.title_en },
    description: {
      en: item.resolution_criteria_en || group.description_en,
      my: item.resolution_criteria_my || group.description_my || item.resolution_criteria_en,
    },
    category: cat.categorySlug,
    icon: group.picture_url ? group.picture_url : pickIcon(group.title_en),
    yesPrice,
    volume,
    liquidity: volume,
    endDate: item.close_time,
    participants: participantsFromPool(pool),
    history: buildHistory(yesPrice),
    status: item.status,
    resolvedOutcome: mapOutcome(item.outcome),
  };
}

export function mapApiGroupToCard(group: ApiMarketGroup): MarketGroupCard | null {
  const items: MarketItemRow[] = [];
  for (const item of group.market_items ?? []) {
    if (item.status === "draft") continue;
    if (!isCustomerVisibleStatus(item.status)) continue;
    items.push(mapItemRow(item, group));
  }
  if (items.length === 0) return null;

  const totalVolume = items.reduce((s, i) => s + i.volume, 0);
  const endDate = items.reduce(
    (latest, i) => (new Date(i.endDate) > new Date(latest) ? i.endDate : latest),
    items[0].endDate,
  );
  const cat = categoryFromGroup(group);

  return {
    id: group.id,
    title: { en: group.title_en, my: group.title_my || group.title_en },
    description: { en: group.description_en, my: group.description_my || group.description_en },
    pictureUrl: group.picture_url,
    icon: pickIcon(group.title_en),
    categoryId: cat.categoryId,
    categorySlug: cat.categorySlug,
    categoryTitle: cat.categoryTitle,
    affiliateRatePercent: group.affiliate_rate_percent ?? 0,
    isBanner: group.is_banner ?? false,
    items,
    totalVolume,
    endDate,
  };
}

export function mapApiGroupsToCards(groups: ApiMarketGroup[]): MarketGroupCard[] {
  const out: MarketGroupCard[] = [];
  for (const group of groups) {
    const card = mapApiGroupToCard(group);
    if (card) out.push(card);
  }
  return out;
}

export function mergeMarketGroupIntoCatalog(
  existing: MarketGroupCard[],
  group: ApiMarketGroup,
): MarketGroupCard[] {
  const card = mapApiGroupToCard(group);
  if (!card) return existing;
  const rest = existing.filter((g) => g.id !== card.id);
  return [card, ...rest];
}

/** Flat list of tradeable items (portfolio, legacy helpers). */
export function flattenGroupItems(groups: MarketGroupCard[]): Market[] {
  const out: Market[] = [];
  for (const g of groups) {
    for (const item of g.items) {
      out.push({
        id: item.id,
        slug: item.slug,
        marketGroupId: g.id,
        groupTitle: g.title,
        title: item.title,
        description: g.description,
        category: g.categorySlug,
        icon: g.icon,
        yesPrice: item.yesPrice,
        volume: item.volume,
        liquidity: item.volume,
        endDate: item.endDate,
        participants: 0,
        history: buildHistory(item.yesPrice),
        status: item.status,
        resolvedOutcome: item.resolvedOutcome,
      });
    }
  }
  return out;
}
