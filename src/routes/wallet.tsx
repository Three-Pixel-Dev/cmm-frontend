import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Wallet as WalletIcon } from "lucide-react";
import { walletApi, WALLET_QUERY_KEY } from "@/lib/api/wallet";
import { useRequireProfile } from "@/hooks/useProfile";
import { useAuth } from "@/store/useAuth";
import { parseWalletAmount } from "@/hooks/useWallet";
import { WalletBalanceHero } from "@/components/wallet/WalletBalanceHero";
import { WalletActivityPanel } from "@/components/wallet/WalletActivityPanel";
import { WalletPayoutPanel } from "@/components/wallet/WalletPayoutPanel";
import { WalletDepositDialog } from "@/components/wallet/WalletDepositDialog";
import { WalletWithdrawDialog } from "@/components/wallet/WalletWithdrawDialog";

export const Route = createFileRoute("/wallet")({
  head: () => ({ meta: [{ title: "Chips — SuperCash" }] }),
  component: WalletPage,
});

function WalletPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const user = useAuth((s) => s.user);

  useEffect(() => {
    if (!isLoggedIn) navigate({ to: "/login", search: { redirect: "/wallet" } });
  }, [isLoggedIn, navigate]);

  const needsProfile = useRequireProfile();
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const walletQ = useQuery({
    queryKey: [WALLET_QUERY_KEY, user?.id],
    queryFn: () => walletApi.getMine(),
    enabled: isLoggedIn && !!user?.id,
  });

  if (!isLoggedIn || needsProfile) return null;

  const cash = parseWalletAmount(walletQ.data?.amount);
  const playBalance = parseWalletAmount(walletQ.data?.virtual_amount);

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
      <header className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <WalletIcon className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("wallet.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("wallet.subtitle")}</p>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <WalletBalanceHero
          cash={cash}
          playBalance={playBalance}
          isLoading={walletQ.isLoading}
          onDeposit={() => setDepositOpen(true)}
          onWithdraw={() => setWithdrawOpen(true)}
        />

        <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
          <div className="order-1 lg:col-span-2">
            <WalletPayoutPanel />
          </div>
          <div className="order-2 lg:col-span-3">
            {user?.id && <WalletActivityPanel userId={user.id} />}
          </div>
        </div>
      </div>

      <WalletDepositDialog open={depositOpen} onClose={() => setDepositOpen(false)} />
      <WalletWithdrawDialog open={withdrawOpen} onClose={() => setWithdrawOpen(false)} />
    </main>
  );
}
