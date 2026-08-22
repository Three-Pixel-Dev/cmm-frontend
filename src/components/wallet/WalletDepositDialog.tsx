import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PayslipUploadField } from "@/components/p2p/PayslipUploadField";
import { walletFundingApi, WALLET_FUNDING_QUERY_KEY } from "@/lib/api/walletFunding";
import { fmtKyat } from "@/lib/format";
import { cn } from "@/lib/utils";

type Step = "amount" | "method" | "proof" | "confirm" | "done";

export function WalletDepositDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [slipUrl, setSlipUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const methodsQ = useQuery({
    queryKey: ["wallet-funding", "deposit-methods"],
    queryFn: () => walletFundingApi.listDepositMethods(),
    enabled: open,
  });

  const methods = methodsQ.data ?? [];
  const selected = methods.find((m) => m.id === selectedMethodId) ?? null;
  const amt = parseFloat(amount) || 0;

  useEffect(() => {
    if (!open) return;
    setStep("amount");
    setAmount("");
    setSelectedMethodId("");
    setSlipUrl("");
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open || methodsQ.isLoading || methods.length === 0) return;
    if (selectedMethodId && methods.some((m) => m.id === selectedMethodId)) return;
    setSelectedMethodId(methods[0].id);
  }, [open, methodsQ.isLoading, methods, selectedMethodId]);

  const submitM = useMutation({
    mutationFn: () =>
      walletFundingApi.create({
        type: "deposit",
        amount: String(Math.round(amt)),
        payment_method_id: selectedMethodId,
        slip_url: slipUrl,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WALLET_FUNDING_QUERY_KEY] });
      setStep("done");
    },
    onError: (e: Error) => setError(e.message),
  });

  const steps: Step[] = ["amount", "method", "proof", "confirm", "done"];
  const stepIndex = steps.indexOf(step);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("wallet.funding.depositTitle")}</DialogTitle>
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
            <div className="space-y-1.5">
              <Label htmlFor="deposit-amount">{t("wallet.funding.amountLabel")}</Label>
              <Input
                id="deposit-amount"
                type="number"
                min={1}
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10000"
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("wallet.funding.depositHint")}</p>
            <Button className="w-full" disabled={amt < 1} onClick={() => { setError(null); setStep("method"); }}>
              {t("wallet.funding.continue")} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === "method" && (
          <div className="space-y-4">
            {methodsQ.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : methodsQ.isError ? (
              <p className="text-sm text-destructive" role="alert">
                {(methodsQ.error as Error).message || t("wallet.funding.loadDepositMethodsError")}
              </p>
            ) : methods.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("wallet.funding.noDepositMethods")}</p>
            ) : (
              <ul className="space-y-2" role="listbox" aria-label={t("wallet.funding.selectDepositMethod")}>
                {methods.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedMethodId === m.id}
                      onClick={() => setSelectedMethodId(m.id)}
                      className={cn(
                        "w-full rounded-xl border p-3 text-left transition-colors",
                        selectedMethodId === m.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {m.type.photo_url && (
                          <img src={m.type.photo_url} alt="" className="h-5 w-5 rounded-sm object-cover" />
                        )}
                        <p className="font-medium">{m.name || m.type.name}</p>
                        {m.is_default && (
                          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            {t("wallet.funding.defaultMethod")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-mono text-muted-foreground">{m.address}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("amount")}>{t("wallet.funding.back")}</Button>
              <Button className="flex-1" disabled={!selectedMethodId} onClick={() => { setError(null); setStep("proof"); }}>
                {t("wallet.funding.continue")}
              </Button>
            </div>
          </div>
        )}

        {step === "proof" && (
          <div className="space-y-4">
            <PayslipUploadField value={slipUrl} onChange={setSlipUrl} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("method")}>{t("wallet.funding.back")}</Button>
              <Button className="flex-1" disabled={!slipUrl} onClick={() => { setError(null); setStep("confirm"); }}>
                {t("wallet.funding.continue")}
              </Button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <dl className="space-y-2 rounded-xl border p-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("wallet.funding.amountLabel")}</dt><dd className="font-semibold">{fmtKyat(amt)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("wallet.funding.receiveMethod")}</dt><dd>{selected?.name || selected?.type.name}</dd></div>
            </dl>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("proof")}>{t("wallet.funding.back")}</Button>
              <Button className="flex-1" disabled={submitM.isPending} onClick={() => { setError(null); submitM.mutate(); }}>
                {submitM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("wallet.funding.submitDeposit")}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" aria-hidden />
            <p className="font-medium">{t("wallet.funding.depositSubmitted")}</p>
            <p className="text-sm text-muted-foreground">{t("wallet.funding.depositSubmittedHint")}</p>
            <Button className="w-full" onClick={onClose}>{t("wallet.funding.close")}</Button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {t("wallet.funding.p2pAlt")}{" "}
          <Link to="/p2p" className="font-medium text-primary hover:underline">{t("wallet.funding.p2pLink")}</Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}
