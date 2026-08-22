import { createFileRoute } from "@tanstack/react-router";
import { PreferencesSettingsSection } from "@/components/settings/SettingsSections";

export const Route = createFileRoute("/settings/preferences")({
  head: () => ({ meta: [{ title: "Preferences — Settings — SuperCash" }] }),
  component: PreferencesSettingsSection,
});
