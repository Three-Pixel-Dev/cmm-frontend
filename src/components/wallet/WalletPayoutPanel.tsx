import { useTranslation } from "react-i18next";
import { CreditCard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentMethodsSection } from "@/components/payment/PaymentMethodsSection";

export function WalletPayoutPanel() {
  const { t } = useTranslation();

  return (
    <Card className="border-border/60 shadow-sm lg:sticky lg:top-20">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CreditCard className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <CardTitle className="text-lg">{t("wallet.sectionPayout")}</CardTitle>
            <CardDescription className="mt-0.5">{t("wallet.sectionPayoutHint")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <PaymentMethodsSection embedded />
      </CardContent>
    </Card>
  );
}
