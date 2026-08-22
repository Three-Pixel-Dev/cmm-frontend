import { createFileRoute } from "@tanstack/react-router";
import { BettingModeSettingsSection } from "@/components/settings/SettingsSections";

export const Route = createFileRoute("/settings/bettingmode")({
  head: () => ({ meta: [{ title: "Betting Mode — Settings — SuperCash" }] }),
  component: BettingModeSettingsSection,
});
