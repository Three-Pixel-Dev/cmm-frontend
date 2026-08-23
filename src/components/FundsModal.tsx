import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PlusCircle, MinusCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePortfolio } from "@/store/usePortfolio";
import { fmtKyat } from "@/lib/format";
import { cn } from "@/lib/utils";

const DEPOSIT_PRESETS = [1000, 5000, 10000, 50000];
const WITHDRAW_PRESETS = [500, 1000, 5000, 10000];

type Mode = "deposit" | "withdraw";

export function FundsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("deposit");
  const [amount, setAmount] = useState("");
  const { balance, deposit, withdraw } = usePortfolio();

  const amt = parseFloat(amount) || 0;

  const handleSubmit = () => {
    if (amt <= 0) return;
    if (mode === "deposit") {
      deposit(amt);
      toast.success(t("portfolio.depositSuccess"), {
        description: `+${fmtKyat(amt)}`,
      });
      setAmount("");
      onClose();
    } else {
      const res = withdraw(amt);
      if (res.ok) {
        toast.success(t("portfolio.withdrawSuccess"), {
          description: `-${fmtKyat(amt)}`,
        });
        setAmount("");
        onClose();
      } else {
        toast.error(t("portfolio.insufficientWithdraw"));
      }
    }
  };

  const presets = mode === "deposit" ? DEPOSIT_PRESETS : WITHDRAW_PRESETS;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {mode === "deposit" ? t("portfolio.depositTitle") : t("portfolio.withdrawTitle")}
          </DialogTitle>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-elevated p-1">
          {(["deposit", "withdraw"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setAmount("");
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-semibold transition-all",
                mode === m
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "deposit" ? (
                <PlusCircle className="h-4 w-4" />
              ) : (
                <MinusCircle className="h-4 w-4" />
              )}
              {t(`portfolio.${m}`)}
            </button>
          ))}
        </div>

        {/* Balance display */}
        <div className="rounded-lg bg-elevated/60 px-4 py-3 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            {t("portfolio.balance")}
          </div>
          <div className="mt-0.5 text-xl font-bold tabular-nums">{fmtKyat(balance)}</div>
        </div>

        {/* Amount input */}
        <div>
          <label className="text-xs text-muted-foreground">{t("market.amount")}</label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
              K
            </span>
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 pl-7 text-base font-semibold tabular-nums bg-elevated"
              placeholder="0"
            />
          </div>
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {presets.map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className="rounded-md border border-border bg-elevated px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              >
                K{v.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={amt <= 0}
          className={cn(
            "w-full h-11 font-semibold",
            mode === "deposit"
              ? "bg-yes text-yes-foreground hover:bg-yes/90"
              : "bg-no text-no-foreground hover:bg-no/90",
          )}
        >
          {mode === "deposit" ? t("portfolio.deposit") : t("portfolio.withdraw")}
          {amt > 0 && ` · ${fmtKyat(amt)}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
