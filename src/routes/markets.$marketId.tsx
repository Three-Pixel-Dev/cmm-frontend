import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { MarketCard } from "@/components/MarketCard";
import {
  MARKET_GROUP_DETAIL_KEY,
  useMarketGroupDetail,
} from "@/hooks/useMarketGroupDetail";
import { useMarketLiveChannel } from "@/hooks/useMarketPoolRealtime";
import { useQuery } from "@tanstack/react-query";
import { marketsApi } from "@/lib/api/markets";
import { mapApiGroupsToCards } from "@/lib/markets/map";
import { MarketDetail } from "@/components/market/MarketDetail";
import { useReferralCapture } from "@/hooks/useReferralAttribution";
import { getSiteUrl } from "@/lib/app-url";
import { loadMarketGroupDetail } from "@/lib/markets/loadMarketGroupDetail";
import { buildMarketShareMeta } from "@/lib/seo/marketShareMeta";

type MarketSearch = {
  side?: "yes" | "no";
  optionId?: string;
  itemId?: string;
  ref?: string;
};

export const Route = createFileRoute("/markets/$marketId")({
  validateSearch: (search: Record<string, unknown>): MarketSearch => ({
    side: search.side === "yes" || search.side === "no" ? search.side : undefined,
    optionId: typeof search.optionId === "string" ? search.optionId : undefined,
    itemId: typeof search.itemId === "string" ? search.itemId : undefined,
    ref: typeof search.ref === "string" ? search.ref : undefined,
  }),
  loader: async ({ params, context, location }) => {
    const ref = new URLSearchParams(location.search).get("ref") ?? undefined;
    try {
      const detail = await context.queryClient.ensureQueryData({
        queryKey: [MARKET_GROUP_DETAIL_KEY, params.marketId],
        queryFn: () => loadMarketGroupDetail(params.marketId),
      });
      return { detail, ref };
    } catch {
      return { detail: null, ref };
    }
  },
  head: async ({ loaderData, params }) => {
    let detail = loaderData?.detail ?? null;
    if (!detail) {
      try {
        detail = await loadMarketGroupDetail(params.marketId);
      } catch {
        detail = null;
      }
    }
    if (!detail) {
      return { meta: [{ title: "Market — SuperCash" }] };
    }
    return buildMarketShareMeta(detail, {
      marketId: params.marketId,
      ref: loaderData?.ref,
      siteUrl: getSiteUrl(),
    });
  },
  component: MarketPage,
});

function MarketPage() {
  const { marketId } = Route.useParams();
  const { side, optionId, itemId, ref } = Route.useSearch();
  const { detail: loaderDetail } = Route.useLoaderData();
  const { t } = useTranslation();
  const { data: detail, isLoading, isError, error } = useMarketGroupDetail(marketId, {
    refetchInterval: 1_500,
  });

  const resolvedDetail = detail ?? loaderDetail ?? undefined;

  const { data: related = [] } = useQuery({
    queryKey: ["markets", "related", resolvedDetail?.categoryId, marketId],
    queryFn: async () => {
      const page = await marketsApi.list({
        category_id: resolvedDetail!.categoryId,
        limit: 5,
      });
      return mapApiGroupsToCards(page.items).filter((g) => g.id !== marketId).slice(0, 4);
    },
    enabled: !!resolvedDetail?.categoryId,
    staleTime: 30_000,
  });
  useReferralCapture(marketId, ref);

  const itemIds = resolvedDetail?.items.map((i) => i.id) ?? [];
  useMarketLiveChannel(itemIds);

  if (isLoading && !resolvedDetail) {
    return (
      <main
        className="flex min-h-[50vh] items-center justify-center"
        aria-busy="true"
        aria-label={t("common.loading")}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if ((isError && !resolvedDetail) || !resolvedDetail) {
    return (
      <main className="mx-auto max-w-[800px] px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">{t("common.notFound")}</h1>
        {isError && (
          <p className="mt-2 text-sm text-muted-foreground">{(error as Error).message}</p>
        )}
        <Link to="/" className="mt-4 inline-block text-primary hover:underline">
          {t("common.backHome")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6 xl:px-10">
      <MarketDetail
        detail={resolvedDetail}
        focusItemId={itemId}
        initialSide={side}
        initialOptionId={optionId}
      />
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold">{t("market.relatedMarkets")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((g) => (
              <MarketCard key={g.id} group={g} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
