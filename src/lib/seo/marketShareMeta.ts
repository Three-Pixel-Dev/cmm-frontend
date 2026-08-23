import { getSiteUrl } from "@/lib/app-url";
import { fmtDate } from "@/lib/format";
import type { MarketDetails } from "@/lib/markets/loadMarketGroupDetail";

const SITE_NAME = "SuperCash";
const DESCRIPTION_MAX = 160;

function truncate(text: string, max = DESCRIPTION_MAX): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function earliestCloseDate(items: MarketDetails["items"]): string | undefined {
  const active = items.filter(
    (i) => i.status !== "settled" && i.status !== "cancelled" && i.status !== "voided",
  );
  const pool = active.length > 0 ? active : items;
  if (pool.length === 0) return undefined;

  const earliest = pool.reduce((min, item) => {
    const t = new Date(item.close_time).getTime();
    return t < min ? t : min;
  }, Infinity);

  if (!Number.isFinite(earliest)) return undefined;
  return fmtDate(new Date(earliest).toISOString());
}

export function buildMarketShareTitle(market: MarketDetails): string {
  const closeDate = earliestCloseDate(market.items);
  const base = market.title.en.trim();
  if (closeDate) {
    return `${base} (${closeDate}) | ${SITE_NAME}`;
  }
  return `${base} | ${SITE_NAME}`;
}

/** Facebook often ignores very short descriptions (e.g. "test"). */
export function buildMarketShareDescription(market: MarketDetails): string {
  const raw = market.description.en.trim();
  if (raw.length >= 20) return truncate(raw);

  const title = market.title.en.trim();
  const closeDate = earliestCloseDate(market.items);
  if (closeDate) {
    return truncate(
      `Predict on "${title}" — closes ${closeDate}. Bet YES or NO on ${SITE_NAME} prediction markets.`,
    );
  }
  return truncate(`Predict on "${title}". Bet YES or NO on ${SITE_NAME} prediction markets.`);
}

export function buildMarketShareUrl(marketId: string, siteUrl: string, ref?: string): string {
  const base = `${siteUrl.replace(/\/$/, "")}/markets/${marketId}`;
  if (!ref?.trim()) return base;
  return `${base}?ref=${encodeURIComponent(ref.trim())}`;
}

export function buildMarketShareImage(market: MarketDetails, siteUrl: string): string {
  const picture = market.pictureUrl?.trim();
  if (picture && (picture.startsWith("http://") || picture.startsWith("https://"))) {
    return picture;
  }
  return `${siteUrl.replace(/\/$/, "")}/logo.png`;
}

export type HeadResult = {
  meta: Array<
    { title: string } | { name: string; content: string } | { property: string; content: string }
  >;
  links?: Array<{ rel: string; href: string }>;
};

export function buildMarketShareMeta(
  market: MarketDetails,
  options: {
    marketId: string;
    ref?: string;
    siteUrl?: string;
  },
): HeadResult {
  const siteUrl = options.siteUrl ?? getSiteUrl();
  const title = buildMarketShareTitle(market);
  const description = buildMarketShareDescription(market);
  const image = buildMarketShareImage(market, siteUrl);
  const url = buildMarketShareUrl(options.marketId, siteUrl, options.ref);

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:locale", content: "en_US" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:image", content: image },
      ...(image.startsWith("https://")
        ? [{ property: "og:image:secure_url", content: image }]
        : []),
      { property: "og:image:alt", content: title },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function buildDefaultSiteMeta(siteUrl?: string): HeadResult {
  const origin = siteUrl ?? getSiteUrl();
  const title = `${SITE_NAME} — Predict more, Win more`;
  const description =
    "SuperCash is a web-based prediction platform. Join YES/NO markets on crypto, sports, entertainment, finance and trending news.";
  const image = `${origin.replace(/\/$/, "")}/logo.png`;

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:image", content: image },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
    ],
  };
}
