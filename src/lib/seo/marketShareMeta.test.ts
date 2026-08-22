import { describe, expect, it } from "vitest";
import type { MarketDetails } from "@/lib/markets/loadMarketGroupDetail";
import { buildMarketShareMeta, buildMarketShareTitle } from "@/lib/seo/marketShareMeta";

function sampleMarket(overrides?: Partial<MarketDetails>): MarketDetails {
  return {
    id: "9cfa5753-2a3f-4634-82c7-7e825d299b10",
    title: { en: "USA vs UAE", my: "" },
    description: { en: "World Cup", my: "" },
    pictureUrl: "",
    categoryId: "cat-1",
    categorySlug: "general",
    icon: "📊",
    affiliateRatePercent: 0,
    items: [
      {
        id: "item-1",
        slug: "who-will-win",
        title: { en: "Who will win?", my: "" },
        description: { en: "", my: "" },
        start_time: "2026-06-01T00:00:00.000Z",
        close_time: "2026-06-20T12:00:00.000Z",
        resolution_time: "2026-06-21T00:00:00.000Z",
        resolved_time: null,
        status: "open",
        outcome: null,
        one_share_price: 5000,
        platform_fee_percentage: 5,
        real_pool: null,
      },
    ],
    ...overrides,
  };
}

function metaContent(
  head: ReturnType<typeof buildMarketShareMeta>,
  key: "og:title" | "twitter:title" | "og:image:alt",
): string | undefined {
  const entry = head.meta.find(
    (m) => "property" in m && m.property === key,
  ) as { property: string; content: string } | undefined;
  if (entry) return entry.content;
  const nameEntry = head.meta.find(
    (m) => "name" in m && m.name === key,
  ) as { name: string; content: string } | undefined;
  return nameEntry?.content;
}

describe("buildMarketShareTitle", () => {
  it("includes close date and SuperCash suffix", () => {
    const title = buildMarketShareTitle(sampleMarket());
    expect(title).toBe("USA vs UAE (Jun 20, 2026) | SuperCash");
  });

  it("omits date when there are no items", () => {
    const title = buildMarketShareTitle(sampleMarket({ items: [] }));
    expect(title).toBe("USA vs UAE | SuperCash");
  });
});

describe("buildMarketShareMeta", () => {
  it("uses full share title for og:title and twitter:title", () => {
    const marketId = "9cfa5753-2a3f-4634-82c7-7e825d299b10";
    const head = buildMarketShareMeta(sampleMarket(), {
      marketId,
      siteUrl: "https://www.supercash.ltd",
    });

    const expected = "USA vs UAE (Jun 20, 2026) | SuperCash";

    expect(head.meta.find((m) => "title" in m)).toEqual({ title: expected });
    expect(metaContent(head, "og:title")).toBe(expected);
    expect(metaContent(head, "twitter:title")).toBe(expected);
    expect(metaContent(head, "og:image:alt")).toBe(expected);
  });
});
