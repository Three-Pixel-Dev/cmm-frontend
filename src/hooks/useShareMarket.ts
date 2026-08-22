import { useQuery } from "@tanstack/react-query";
import { referralApi } from "@/lib/api/referral";
import { buildGuestShareUrl, buildReferralShareUrl } from "@/hooks/useReferralAttribution";

export function useShareMarket(marketId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["referral-link", marketId],
    queryFn: () => referralApi.createOrGetLink(marketId),
    enabled: enabled && !!marketId,
    staleTime: 60_000,
    retry: 1,
  });
}

export function shareUrlForMarket(
  marketId: string,
  link?: { code: string; url: string } | null,
  isLoggedIn?: boolean,
): string {
  if (isLoggedIn && link?.code) {
    return buildReferralShareUrl(marketId, link.code);
  }
  return buildGuestShareUrl(marketId);
}
