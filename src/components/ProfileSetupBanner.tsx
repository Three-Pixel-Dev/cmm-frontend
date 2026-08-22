import { Link, useMatchRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useProfileStatus } from "@/hooks/useProfile";

/**
 * Persistent reminder shown directly below the header while the signed-in
 * user's profile is incomplete. Hidden on the profile settings page itself,
 * where the form already lives.
 */
export function ProfileSetupBanner() {
  const { t } = useTranslation();
  const { needsSetup } = useProfileStatus();
  const matchRoute = useMatchRoute();
  const onProfilePage = Boolean(matchRoute({ to: "/settings/profile", fuzzy: false }));
  const onP2PPage = Boolean(matchRoute({ to: "/p2p", fuzzy: true }));

  if (!needsSetup || onProfilePage || onP2PPage) return null;

  return (
    <div
      role="region"
      aria-label={t("settings.profileSetupTitle")}
      className="border-b border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100"
    >
      <div className="mx-auto flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-8 xl:px-10">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-semibold">{t("settings.profileSetupTitle")}</span>{" "}
          <span className="text-amber-800/90 dark:text-amber-200/80">
            {t("settings.profileSetupDesc")}
          </span>
        </p>
        <Link
          to="/settings/profile"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {t("settings.profileSetupCta")}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
