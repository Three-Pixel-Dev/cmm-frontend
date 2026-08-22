import { createFileRoute } from "@tanstack/react-router";
import { PaymentSettingsSection } from "@/components/settings/SettingsSections";

export const Route = createFileRoute("/settings/payment")({
  head: () => ({ meta: [{ title: "Payment methods — Settings — SuperCash" }] }),
  component: PaymentSettingsSection,
});
