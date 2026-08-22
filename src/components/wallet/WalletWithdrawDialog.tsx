import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentMethodFormDialog } from "@/components/payment/PaymentMethodFormDialog";
import {
  PaymentMethodDetailPanel,
  PaymentMethodSelector,
  type PaymentMethodOption,
} from "@/components/p2p/PaymentMethodSelector";
import { paymentMethodsApi } from "@/lib/api/paymentMethods";
import { walletFundingApi, WALLET_FUNDING_QUERY_KEY } from "@/lib/api/walletFunding";
import { WALLET_QUERY_KEY } from "@/lib/api/wallet";
import { useWallet, parseWalletAmount } from "@/hooks/useWallet";
import { useAuth } from "@/store/useAuth";
import { fmtKyat } from "@/lib/format";
import { filterP2PPaymentMethods } from "@/lib/p2p/paymentMethods";
import { cn } from "@/lib/utils";

type Step = "amount" | "method" | "confirm" | "done";

function toPaymentOption(m: {
  id: string;
  name?: string;
  address: string;
  is_default?: boolean;
  type?: { id?: string; name?: string; logo_url?: string; photo_url?: string };
}): PaymentMethodOption {
  return {
    id: m.id,
    name: m.name,
    address: m.address,
    is_default: m.is_default,
    type: {
      id: m.type?.id ?? "",
      name: m.type?.name ?? "Payment method",
      photo_url: m.type?.photo_url ?? m.type?.logo_url,
    },
  };
}

export function WalletWithdrawDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const { data: wallet } = useWallet(user?.id);
  const balance = parseWalletAmount(wallet?.amount);

  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const methodsQ = useQuery({
    queryKey: ["payment-methods", "me"],
    queryFn: () => paymentMethodsApi.listMine(),
    enabled: open,
  });

  const methods: PaymentMethodOption[] = useMemo(
    () => filterP2PPaymentMethods(methodsQ.data ?? []).map(toPaymentOption),
    [methodsQ.data],
  );
  const selected = methods.find((m) => m.id === selectedMethodId) ?? null;
  const amt = parseFloat(amount) || 0;

  useEffect(() => {
    if (!open) return;
    setStep("amount");
    setAmount("");
    setSelectedMethodId("");
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open || methodsQ.isLoading || methods.length === 0) return;
    if (selectedMethodId && methods.some((m) => m.id === selectedMethodId)) return;
    const preferred = methods.find((m) => m.is_default) ?? methods[0];
    if (preferred) setSelectedMethodId(preferred.id);
  }, [open, methodsQ.isLoading, methods, selectedMethodId]);

  const submitM = useMutation({
    mutationFn: () =>
      walletFundingApi.create({
        type: "withdraw",
        amount: String(Math.round(amt)),
        payment_method_id: selectedMethodId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WALLET_FUNDING_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [WALLET_QUERY_KEY] });
      setStep("done");
    },
    onError: (e: Error) => setError(e.message),
  });

  const steps: Step[] = ["amount", "method", "confirm", "done"];
  const stepIndex = steps.indexOf(step);

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("wallet.funding.withdrawTitle")}</DialogTitle>
          </DialogHeader>

          <ol className="mb-4 flex gap-2" aria-label={t("wallet.funding.stepsLabel")}>
            {steps.slice(0, -1).map((s, i) => (
              <li
                key={s}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  i <= stepIndex ? "bg-primary" : "bg-muted",
                )}
                aria-current={step === s ? "step" : undefined}
              />
            ))}
          </ol>

          {error && (
            <div role="alert" className="mb-3 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          {step === "amount" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("wallet.funding.availableBalance")}: <span className="font-semibold text-foreground">{fmtKyat(balance)}</span>
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="withdraw-amount">{t("wallet.funding.amountLabel")}</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  min={1}
                  max={balance}
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">{t("wallet.funding.withdrawHoldHint")}</p>
              <Button
                className="w-full"
                disabled={amt < 1 || amt > balance}
                onClick={() => { setError(null); setStep("method"); }}
              >
                {t("wallet.funding.continue")} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {step === "method" && (
            <div className="space-y-4">
              {methodsQ.isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : methods.length === 0 ? (
                <div className="space-y-3 text-center">
                  <p className="text-sm text-muted-foreground">{t("wallet.funding.noPayoutMethods")}</p>
                  <Button variant="outline" onClick={() => setAddPaymentOpen(true)}>{t("wallet.funding.addPayoutMethod")}</Button>
                </div>
              ) : (
                <>
                  <PaymentMethodSelector
                    methods={methods}
                    selectedId={selectedMethodId}
                    onSelect={setSelectedMethodId}
                    helpText={t("wallet.funding.payoutMethod")}
                  />
                  {selected && <PaymentMethodDetailPanel method={selected} hint={t("wallet.funding.payoutDetail")} />}
                </>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("amount")}>{t("wallet.funding.back")}</Button>
                <Button className="flex-1" disabled={!selectedMethodId} onClick={() => { setError(null); setStep("confirm"); }}>
                  {t("wallet.funding.continue")}
                </Button>
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-4">
              <dl className="space-y-2 rounded-xl border p-4 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">{t("wallet.funding.amountLabel")}</dt><dd className="font-semibold">{fmtKyat(amt)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">{t("wallet.funding.payoutMethod")}</dt><dd>{selected?.name || selected?.type.name}</dd></div>
              </dl>
              <p className="text-xs text-muted-foreground">{t("wallet.funding.withdrawConfirmHint")}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("method")}>{t("wallet.funding.back")}</Button>
                <Button className="flex-1" disabled={submitM.isPending} onClick={() => { setError(null); submitM.mutate(); }}>
                  {submitM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("wallet.funding.submitWithdraw")}
                </Button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" aria-hidden />
              <p className="font-medium">{t("wallet.funding.withdrawSubmitted")}</p>
              <p className="text-sm text-muted-foreground">{t("wallet.funding.withdrawSubmittedHint")}</p>
              <Button className="w-full" onClick={onClose}>{t("wallet.funding.close")}</Button>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            {t("wallet.funding.p2pAlt")}{" "}
            <Link to="/p2p" className="font-medium text-primary hover:underline">{t("wallet.funding.p2pLink")}</Link>
          </p>
        </DialogContent>
      </Dialog>

      {addPaymentOpen && (
        <PaymentMethodFormDialog
          open={addPaymentOpen}
          mode="create"
          method={null}
          nested
          excludeCryptoTypes
          onOpenChange={setAddPaymentOpen}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["payment-methods", "me"] });
            toast.success(t("wallet.funding.payoutMethodSaved"));
          }}
        />
      )}
    </>
  );
}
