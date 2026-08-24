import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/lib/api/profile";
import type { ApiProfile } from "@/lib/api/types";
import { useAuth } from "@/store/useAuth";

/** Shared cache key — kept in sync with the profile form's invalidation. */
export const PROFILE_QUERY_KEY = ["profile", "me"] as const;

/**
 * A profile counts as "set up" once the core identity fields used for
 * P2P trades and withdrawals are present. We require an NRC **or** a passport,
 * not both.
 */
export function isProfileComplete(p: ApiProfile | null | undefined): boolean {
  if (!p) return false;
  const hasBirthInfo = !!p.date_of_birth || p.age != null;
  return (
    hasBirthInfo &&
    !!p.gender &&
    !!p.phone_number &&
    !!p.nationality &&
    !!p.address &&
    (!!p.nrc || !!p.passport)
  );
}

/** Fetches the current user's profile (null when none exists). */
export function useProfile() {
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => profileApi.getMine().catch(() => null),
    enabled: isLoggedIn,
    staleTime: 30_000,
  });
}

export type ProfileStatus = {
  isLoading: boolean;
  isComplete: boolean;
  /** Logged in, the query has resolved, and the profile is incomplete. */
  needsSetup: boolean;
};

export function useProfileStatus(): ProfileStatus {
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const q = useProfile();
  const isComplete = isProfileComplete(q.data);
  return {
    isLoading: q.isLoading,
    isComplete,
    needsSetup: isLoggedIn && q.isFetched && !isComplete,
  };
}
