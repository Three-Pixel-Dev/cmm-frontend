import { createFileRoute } from "@tanstack/react-router";
import { ProfileSettingsSection } from "@/components/settings/SettingsSections";

export const Route = createFileRoute("/settings/profile")({
  head: () => ({ meta: [{ title: "Profile — Settings — SuperCash" }] }),
  component: ProfileSettingsSection,
});
