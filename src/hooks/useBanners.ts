import { useQuery } from "@tanstack/react-query";
import { bannersApi } from "@/lib/api/markets";

export const PROMO_BANNERS_KEY = ["promo-banners"] as const;

/** Fetches active promotional image banners for the customer homepage carousel. */
export function usePromoBanners() {
  return useQuery({
    queryKey: PROMO_BANNERS_KEY,
    queryFn: () => bannersApi.listActive(),
    staleTime: 60_000,
  });
}
