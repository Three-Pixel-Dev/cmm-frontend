import { useTranslation } from "react-i18next";
import { History, Link2, ReceiptText, ClipboardList } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionsSection } from "@/components/wallet/TransactionsSection";
import { BettingHistoriesSection } from "@/components/wallet/BettingHistoriesSection";
import { AffiliateEarningsSection } from "@/components/wallet/AffiliateEarningsSection";
import { FundingRequestsSection } from "@/components/wallet/FundingRequestsSection";

export function WalletActivityPanel({ userId }: { userId: string }) {
  const { t } = useTranslation();

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{t("wallet.sectionActivity")}</CardTitle>
        <CardDescription>{t("wallet.sectionActivityHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="mb-4 flex h-auto w-full flex-col gap-1 p-1 sm:grid sm:grid-cols-2 lg:grid-cols-4">
            <TabsTrigger
              value="transactions"
              className="w-full justify-center gap-1.5 px-2 py-2.5 text-xs sm:text-sm"
            >
              <ReceiptText className="hidden h-4 w-4 sm:block" aria-hidden />
              {t("wallet.tabTransactions")}
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="w-full justify-center gap-1.5 px-2 py-2.5 text-xs sm:text-sm"
            >
              <ClipboardList className="hidden h-4 w-4 sm:block" aria-hidden />
              {t("wallet.tabRequests")}
            </TabsTrigger>
            <TabsTrigger
              value="betting"
              className="w-full justify-center gap-1.5 px-2 py-2.5 text-xs sm:text-sm"
            >
              <History className="hidden h-4 w-4 sm:block" aria-hidden />
              {t("wallet.tabBetting")}
            </TabsTrigger>
            <TabsTrigger
              value="affiliate"
              className="w-full justify-center gap-1.5 px-2 py-2.5 text-xs sm:text-sm"
            >
              <Link2 className="hidden h-4 w-4 sm:block" aria-hidden />
              {t("wallet.tabAffiliate")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-0 focus-visible:ring-0">
            <TransactionsSection userId={userId} embedded />
          </TabsContent>
          <TabsContent value="requests" className="mt-0 focus-visible:ring-0">
            <FundingRequestsSection embedded />
          </TabsContent>
          <TabsContent value="betting" className="mt-0 focus-visible:ring-0">
            <BettingHistoriesSection userId={userId} embedded />
          </TabsContent>
          <TabsContent value="affiliate" className="mt-0 focus-visible:ring-0">
            <AffiliateEarningsSection userId={userId} embedded />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
