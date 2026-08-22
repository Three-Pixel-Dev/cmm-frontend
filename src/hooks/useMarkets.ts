import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { marketCategoriesApi, marketsApi } from "@/lib/api/markets";
import { mapApiGroupsToCards } from "@/lib/markets/map";

export const MARKETS_CATALOG_KEY = ["markets", "catalog"] as const;

/** @deprecated Prefer useMarketsInfinite for paginated catalog views. */
export function useMarketsCatalog(search?: string) {
  return useQuery({
    queryKey: [...MARKETS_CATALOG_KEY, search ?? ""],
    queryFn: async () => {
      const page = await marketsApi.list({ search, page: 1, limit: 200 });
      return mapApiGroupsToCards(page.items);
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export const BANNER_MARKETS_KEY = ["markets", "banner"] as const;

/** Markets flagged is_banner in admin — featured in the homepage banner carousel. */
export function useBannerMarkets() {
  return useQuery({
    queryKey: BANNER_MARKETS_KEY,
    queryFn: async () => {
      const page = await marketsApi.list({ banner: true, page: 1, limit: 20 });
      return mapApiGroupsToCards(page.items);
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarketCategories() {
  return useQuery({
    queryKey: ["market-categories"],
    queryFn: () => marketCategoriesApi.list(),
    staleTime: 60_000,
  });
}

export type MarketsInfiniteFilter = {
  categoryId?: string;
  sort?: "created" | "volume";
};

export function useMarketsInfinite(filter: MarketsInfiniteFilter = {}) {
  const { categoryId, sort = "created" } = filter;
  return useInfiniteQuery({
    queryKey: ["markets", "infinite", categoryId ?? "all", sort],
    queryFn: async ({ pageParam }) => {
      const page = await marketsApi.list({
        page: pageParam,
        limit: 20,
        category_id: categoryId,
        sort: sort === "volume" ? "volume" : undefined,
      });
      return {
        items: mapApiGroupsToCards(page.items),
        meta: page.meta,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.total_pages ? last.meta.page + 1 : undefined,
    staleTime: 30_000,
  });
}

export function useTopMarkets() {
  return useQuery({
    queryKey: ["markets", "top"],
    queryFn: async () => {
      const page = await marketsApi.list({ limit: 3, sort: "volume" });
      return mapApiGroupsToCards(page.items);
    },
    staleTime: 30_000,
  });
}

export function useClosingSoonMarkets() {
  return useQuery({
    queryKey: ["markets", "closing-soon"],
    queryFn: async () => {
      const page = await marketsApi.list({ limit: 12, closing_soon: true });
      return mapApiGroupsToCards(page.items);
    },
    staleTime: 30_000,
  });
}

export function useMarketSearch(search: string) {
  return useQuery({
    queryKey: ["markets", "search", search],
    queryFn: async () => {
      const page = await marketsApi.list({ search, limit: 20 });
      return mapApiGroupsToCards(page.items);
    },
    enabled: search.trim().length > 0,
    staleTime: 15_000,
  });
}
