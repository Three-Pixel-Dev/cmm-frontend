import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { profileApi } from "@/lib/api/profile";
import type { ApiProfile } from "@/lib/api/types";
import { useAuth } from "@/store/useAuth";

/** Shared cache key — kept in sync with the profile form's invalidation. */
export const PROFILE_QUERY_KEY = ["profile", "me"] as const;

/**
 * A profile counts as "set up" once the core identity fields used for
 * verification and payouts are present. We require an NRC **or** a passport,
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

/**
 * Gate for pages/actions that require a completed profile. When the profile
 * still needs setup, it bounces the user to the profile settings page with a
 * heads-up toast. Returns `needsSetup` so callers can also skip rendering.
 */
export function useRequireProfile(): boolean {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { needsSetup } = useProfileStatus();

  useEffect(() => {
    if (!needsSetup) return;
    toast.warning(t("settings.profileSetupTitle"), {
      description: t("settings.profileSetupDesc"),
    });
    navigate({ to: "/settings/profile" });
  }, [needsSetup, navigate, t]);

  return needsSetup;
}
