import { useTranslation } from "react-i18next";
import { Coins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtKyat } from "@/lib/format";

type WalletBalanceHeroProps = {
  cash: number;
  isLoading?: boolean;
  onDeposit?: () => void;
  onWithdraw?: () => void;
};

export function WalletBalanceHero({
  cash,
  isLoading,
  onDeposit,
  onWithdraw,
}: WalletBalanceHeroProps) {
  const { t } = useTranslation();

  return (
    <div className="hud-panel relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/12 via-card to-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("wallet.cash")}
          </p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums tracking-wide sm:text-4xl">
            {isLoading ? "—" : fmtKyat(cash)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{t("wallet.cashHint")}</p>
          {!isLoading && onDeposit && onWithdraw ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="min-h-11 flex-1 sm:flex-none"
                onClick={onDeposit}
                aria-label={t("wallet.funding.depositTitle")}
              >
                {t("wallet.funding.depositCta")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-11 flex-1 sm:flex-none"
                onClick={onWithdraw}
                aria-label={t("wallet.funding.withdrawTitle")}
              >
                {t("wallet.funding.withdrawCta")}
              </Button>
            </div>
          ) : null}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Coins className="h-5 w-5" aria-hidden />
        </div>
      </div>
      {isLoading && (
        <Loader2
          className="absolute bottom-4 right-4 h-4 w-4 animate-spin text-muted-foreground"
          aria-hidden
        />
      )}
    </div>
  );
}
