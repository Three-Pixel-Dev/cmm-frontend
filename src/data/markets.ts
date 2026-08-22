export type Bilingual = { en: string; my: string };

export type MarketOutcome = "yes" | "no";

export type Market = {
  id: string;
  slug: string;
  marketGroupId?: string;
  groupTitle?: Bilingual;
  title: Bilingual;
  description: Bilingual;
  category: string;
  icon: string;
  yesPrice: number;
  volume: number;
  liquidity: number;
  endDate: string;
  participants: number;
  history: { t: string; p: number }[];
  status?: string;
  resolvedOutcome?: MarketOutcome;
};

/** True when the item is terminal or past close time. */
export function isResolved(m: Market): boolean {
  if (m.status === "settled" || m.status === "cancelled" || m.status === "voided") return true;
  return new Date(m.endDate) < new Date();
}

/** True if the market closes within the next 7 days */
export function isClosingSoon(m: Market): boolean {
  const end = new Date(m.endDate).getTime();
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return !isResolved(m) && end - now <= sevenDays && end > now;
}

export function getOutcome(m: Market): MarketOutcome {
  if (m.resolvedOutcome) return m.resolvedOutcome;
  return m.yesPrice >= 0.5 ? "yes" : "no";
}

export function timeRemaining(m: Market): string {
  const end = new Date(m.endDate).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days >= 1) return `${days}d left`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours >= 1) return `${hours}h left`;
  const mins = Math.floor(diff / (1000 * 60));
  return `${mins}m left`;
}

export const CATEGORY_LABELS = {
  trending: "trending",
  politics: "politics",
  crypto: "crypto",
  sports: "sports",
  pop: "pop",
  tech: "tech",
  world: "world",
  economy: "economy",
} as const;

/** @deprecated Use useMarketsCatalog() — live data from the API */
export const MARKETS: Market[] = [];

export const CATEGORIES = [
  "trending",
  "politics",
  "crypto",
  "sports",
  "pop",
  "tech",
  "world",
  "economy",
] as const;
