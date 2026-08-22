import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SettingsNavLinks } from "@/components/settings/SettingsSections";
import { useAuth } from "@/store/useAuth";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — SuperCash" }] }),
  component: SettingsLayoutPage,
});

function SettingsLayoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isLoggedIn = useAuth((s) => s.isLoggedIn());

  useEffect(() => {
    if (!isLoggedIn) navigate({ to: "/login", search: { redirect: "/settings" } });
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) return null;

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold">{t("settings.title")}</h1>
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:overflow-visible md:px-0 md:pb-0">
          <SettingsNavLinks className="flex min-w-max gap-1 md:block md:min-w-0 md:space-y-1" />
        </aside>
        <Outlet />
      </div>
    </main>
  );
}
