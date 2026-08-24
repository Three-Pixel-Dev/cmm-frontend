import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Wallet as WalletIcon } from "lucide-react";
import { walletApi, WALLET_QUERY_KEY } from "@/lib/api/wallet";
import { useAuth } from "@/store/useAuth";
import { parseWalletAmount } from "@/hooks/useWallet";
import { WalletBalanceHero } from "@/components/wallet/WalletBalanceHero";
import { WalletActivityPanel } from "@/components/wallet/WalletActivityPanel";

export const Route = createFileRoute("/wallet")({
  head: () => ({ meta: [{ title: "Activity — SuperCash" }] }),
  component: WalletPage,
});

function WalletPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const isHost = useAuth((s) => s.isHost());
  const isGuest = useAuth((s) => s.isGuest());
  const user = useAuth((s) => s.user);

  useEffect(() => {
    if (!isLoggedIn) navigate({ to: "/login", search: { redirect: "/wallet" } });
    else if (isHost) navigate({ to: "/" });
  }, [isLoggedIn, isHost, navigate]);

  const walletQ = useQuery({
    queryKey: [WALLET_QUERY_KEY, user?.id],
    queryFn: () => walletApi.getMine(),
    enabled: isLoggedIn && !!user?.id,
  });

  if (!isLoggedIn || isHost) return null;

  const cash = parseWalletAmount(walletQ.data?.amount);

  return (
    <main className="game-shell mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
      <header className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <WalletIcon className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wide sm:text-3xl">{t("wallet.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("wallet.subtitle")}</p>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <WalletBalanceHero cash={cash} isLoading={walletQ.isLoading} />

        <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          {isGuest ? t("wallet.guestHint") : t("wallet.tableChipsHint")}
        </p>

        {user?.id && <WalletActivityPanel userId={user.id} guest={isGuest} />}
      </div>
    </main>
  );
}
