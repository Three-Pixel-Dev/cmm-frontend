import { createMiddleware } from "@tanstack/react-start";
import { getSiteUrl } from "@/lib/app-url";
import { loadMarketGroupDetail } from "@/lib/markets/loadMarketGroupDetail";
import { buildMarketShareMeta } from "@/lib/seo/marketShareMeta";
import { renderOgHtml } from "@/lib/seo/renderOgHtml";

/** User-agents used by Facebook, Telegram, Twitter, etc. when fetching link previews. */
const CRAWLER_UA =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Slackbot|Discordbot|Googlebot|bingbot/i;

const MARKET_PATH = /^\/markets\/([0-9a-f-]{36})(?:\/|$)/i;

export const ogCrawlerMiddleware = createMiddleware().server(async ({ next, request }) => {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (!CRAWLER_UA.test(userAgent)) {
    return next();
  }

  const url = new URL(request.url);
  const match = url.pathname.match(MARKET_PATH);
  if (!match) {
    return next();
  }

  const marketId = match[1];
  const ref = url.searchParams.get("ref") ?? undefined;
  const siteUrl = getSiteUrl(url.origin);

  try {
    const detail = await loadMarketGroupDetail(marketId);
    const head = buildMarketShareMeta(detail, { marketId, ref, siteUrl });
    return new Response(renderOgHtml(head), {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        // Do not public-cache: Vercel CDN would serve this empty page to real users too.
        "cache-control": "private, no-store",
        vary: "User-Agent",
      },
    });
  } catch (error) {
    console.error("[og-crawler]", marketId, error);
    return next();
  }
});
