import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Banknote, Gamepad2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtKyat, fmtVKyat } from "@/lib/format";
import { cn } from "@/lib/utils";

type WalletBalanceHeroProps = {
  cash: number;
  playBalance: number;
  isLoading?: boolean;
  onDeposit?: () => void;
  onWithdraw?: () => void;
};

export function WalletBalanceHero({
  cash,
  playBalance,
  isLoading,
  onDeposit,
  onWithdraw,
}: WalletBalanceHeroProps) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <BalanceCard
        label={t("wallet.cash")}
        hint={t("wallet.cashHint")}
        value={isLoading ? "—" : fmtKyat(cash)}
        icon={Banknote}
        accent="emerald"
        actions={
          !isLoading && (
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
          )
        }
      />
      <BalanceCard
        label={t("wallet.playBalance")}
        hint={t("wallet.playHint")}
        value={isLoading ? "—" : fmtVKyat(playBalance)}
        icon={Gamepad2}
        accent="violet"
      />
    </div>
  );
}

function BalanceCard({
  label,
  hint,
  value,
  icon: Icon,
  accent,
  actions,
}: {
  label: string;
  hint: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  accent: "emerald" | "violet";
  actions?: React.ReactNode;
}) {
  const accentStyles = {
    emerald: {
      border: "border-emerald-500/25",
      bg: "from-emerald-500/12 via-card to-card",
      icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
    violet: {
      border: "border-violet-500/25",
      bg: "from-violet-500/12 via-card to-card",
      icon: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    },
  }[accent];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 sm:p-6",
        accentStyles.border,
        accentStyles.bg,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
          {actions}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            accentStyles.icon,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
      {value === "—" && (
        <Loader2
          className="absolute bottom-4 right-4 h-4 w-4 animate-spin text-muted-foreground"
          aria-hidden
        />
      )}
    </div>
  );
}
