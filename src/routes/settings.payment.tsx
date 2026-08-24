import { createFileRoute, redirect } from "@tanstack/react-router";
import { PaymentSettingsSection } from "@/components/settings/SettingsSections";
import { isGuestEmail } from "@/lib/guest";
import { useAuth } from "@/store/useAuth";

export const Route = createFileRoute("/settings/payment")({
  head: () => ({ meta: [{ title: "Payment methods — Settings — SuperCash" }] }),
  beforeLoad: () => {
    if (isGuestEmail(useAuth.getState().user?.email)) {
      throw redirect({ to: "/settings/preferences" });
    }
  },
  component: PaymentSettingsSection,
});
