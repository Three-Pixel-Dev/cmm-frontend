import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, ChevronRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Agent } from "@/data/agents";
import type { ApiAgentPaymentMethod, ApiPaymentMethod } from "@/lib/api/types";
import { p2pApi } from "@/lib/api/p2p";
import { paymentMethodsApi } from "@/lib/api/paymentMethods";
import { useWallet, parseWalletAmount } from "@/hooks/useWallet";
import { useAuth } from "@/store/useAuth";
import { PayslipUploadField } from "@/components/p2p/PayslipUploadField";
import {
  PaymentMethodDetailPanel,
  PaymentMethodSelector,
  type PaymentMethodOption,
} from "@/components/p2p/PaymentMethodSelector";
import { PaymentMethodFormDialog } from "@/components/payment/PaymentMethodFormDialog";
import { fmtKyat } from "@/lib/format";
import { filterP2PPaymentMethods } from "@/lib/p2p/paymentMethods";
import { cn } from "@/lib/utils";

type Step = "amount" | "proof" | "confirm" | "done";

export function P2POrderModal({
  agent,
  type,
  open,
  onClose,
}: {
  agent: Agent | null;
  type: "buy" | "sell";
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [slipUrl, setSlipUrl] = useState("");
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const { data: wallet } = useWallet(isLoggedIn ? user?.id : undefined);
  const balance = parseWalletAmount(wallet?.amount);

  const isBuy = type === "buy";

  const customerMethodsQ = useQuery({
    queryKey: ["payment-methods", "me"],
    queryFn: () => paymentMethodsApi.listMine(),
    enabled: open && isLoggedIn && type === "sell",
  });

  const agentMethodsQ = useQuery({
    queryKey: ["p2p", "agents", agent?.id, "payment-methods"],
    queryFn: () => p2pApi.listAgentPaymentMethods(agent!.id),
    enabled: open && !!agent && isBuy,
  });

  const rawMethods = isBuy ? (agentMethodsQ.data ?? []) : (customerMethodsQ.data ?? []);
  const methods: PaymentMethodOption[] = filterP2PPaymentMethods(rawMethods).map(toPaymentOption);
  const methodsLoading = isBuy ? agentMethodsQ.isLoading : customerMethodsQ.isLoading;

  useEffect(() => {
    if (!open || !agent || methodsLoading || methods.length === 0) return;
    if (selectedMethodId && methods.some((m) => m.id === selectedMethodId)) return;
    const preferred = methods.find((m) => m.is_default) ?? methods[0];
    if (preferred) setSelectedMethodId(preferred.id);
  }, [open, agent, methodsLoading, methods, selectedMethodId]);

  const submitM = useMutation({
    mutationFn: () => {
      if (!agent) throw new Error("No agent selected");
      return p2pApi.createTradeRequest({
        p2p_id: agent.id,
        type,
        amount: String(amt),
        payment_method_id: selectedMethodId,
        ...(type === "buy" && slipUrl ? { slip_url: slipUrl } : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["p2p", "trade-requests", "me"] });
      setStep("done");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!agent) return null;

  const amt = parseFloat(amount) || 0;
  const commission = Math.round(amt * (agent.commissionRate / 100));
  const net = amt - commission;
  const steps: Step[] = isBuy
    ? ["amount", "proof", "confirm", "done"]
    : ["amount", "confirm", "done"];
  const selectedMethod = methods.find((m) => m.id === selectedMethodId);

  const amountValid =
    amt >= agent.limits.min &&
    amt <= agent.limits.max &&
    selectedMethodId !== "" &&
    methods.length > 0 &&
    (isBuy || amt <= balance);

  const handlePlace = () => {
    if (!isLoggedIn) {
      toast.info(t("p2p.loginToTrade"));
      return;
    }
    submitM.mutate();
  };

  const handleClose = () => {
    setStep("amount");
    setAmount("");
    setSelectedMethodId("");
    setSlipUrl("");
    setAddPaymentOpen(false);
    onClose();
  };

  const addPaymentLink = (
    <button
      type="button"
      onClick={() => setAddPaymentOpen(true)}
      className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
    >
      {methods.length === 0 ? t("p2p.addPaymentMethodLink") : t("p2p.addAnotherPaymentMethod")}
    </button>
  );

  const stepLabel = (s: Step) => {
    if (s === "proof") return t("p2p.proofStep");
    return s;
  };

  const goToNextFromAmount = () => {
    setStep(isBuy ? "proof" : "confirm");
  };

  const goBackFromConfirm = () => {
    setStep(isBuy ? "proof" : "amount");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-8">
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white",
                agent.avatarColor,
              )}
            >
              {agent.initials}
            </span>
            <span>{agent.name}</span>
            {agent.verified && (
              <span className="ml-auto rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-400 uppercase">
                ✓ {t("p2p.verified")}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div
          className="no-scrollbar -mx-1 mb-1 flex items-center gap-1 overflow-x-auto px-1 text-xs text-muted-foreground"
          aria-label="Order progress"
        >
          {steps.map((s, i) => (
            <span key={s} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden />}
              <span
                className={cn("font-medium capitalize", step === s && "text-foreground")}
                aria-current={step === s ? "step" : undefined}
              >
                {stepLabel(s)}
              </span>
            </span>
          ))}
        </div>

        {step === "amount" && (
          <div className="space-y-4">
            <div
              className={cn(
                "rounded-lg px-4 py-3 text-sm font-semibold flex items-center justify-between",
                isBuy ? "bg-yes/10 text-yes" : "bg-no/10 text-no",
              )}
            >
              <span>{isBuy ? `📥 ${t("p2p.buyTab")}` : `📤 ${t("p2p.sellTab")}`}</span>
              <span className="text-xs font-normal opacity-70">
                {t("p2p.commission")} {agent.commissionRate}%
              </span>
            </div>
            <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:justify-between">
              <span>
                {t("p2p.limit")}:{" "}
                <span className="font-semibold text-foreground">
                  {fmtKyat(agent.limits.min)} – {fmtKyat(agent.limits.max)}
                </span>
              </span>
              {!isBuy && (
                <span>
                  {t("portfolio.balance")}:{" "}
                  <span className="font-semibold text-foreground">{fmtKyat(balance)}</span>
                </span>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("market.amount")} (K)</label>
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
                {[10000, 50000, 100000, 500000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(String(v))}
                    className="rounded-md border border-border bg-elevated px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                  >
                    K{(v / 1000).toFixed(0)}K
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">{t("p2p.paymentMethod")}</p>
              {methodsLoading ? (
                <div className="mt-2 flex justify-center py-4" role="status">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
                  <span className="sr-only">{t("payment.loading")}</span>
                </div>
              ) : methods.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {isBuy ? t("p2p.noAgentPaymentMethods") : addPaymentLink}
                </p>
              ) : (
                <div className="mt-2">
                  <PaymentMethodSelector
                    methods={methods}
                    selectedId={selectedMethodId}
                    onSelect={setSelectedMethodId}
                    helpText={isBuy ? t("p2p.buyPaymentHelp") : t("p2p.sellPaymentHelp")}
                    detailHint={
                      isBuy ? t("p2p.buyPaymentDetailHint") : t("p2p.sellPaymentDetailHint")
                    }
                  />
                  {!isBuy && <p className="mt-2 text-xs text-muted-foreground">{addPaymentLink}</p>}
                </div>
              )}
            </div>
            {!isBuy && amt > balance && amt > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-no/10 px-3 py-2 text-xs text-no">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {t("p2p.insufficientBalance")}
              </div>
            )}
            {amt > 0 && (amt < agent.limits.min || amt > agent.limits.max) && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {t("p2p.limitWarning")} {fmtKyat(agent.limits.min)} – {fmtKyat(agent.limits.max)}
              </div>
            )}
            <Button
              onClick={goToNextFromAmount}
              disabled={!amountValid}
              className="w-full h-11 font-semibold"
            >
              {t("p2p.continue")} →
            </Button>
          </div>
        )}

        {step === "proof" && isBuy && (
          <div className="space-y-4">
            {selectedMethod && (
              <PaymentMethodDetailPanel
                method={selectedMethod}
                hint={t("p2p.buyPaymentDetailHint")}
                compact
              />
            )}
            <div className="rounded-lg bg-no/10 px-3 py-2 text-xs text-muted-foreground">
              {t("p2p.payslipHelp")}
            </div>
            <PayslipUploadField value={slipUrl} onChange={setSlipUrl} />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setStep("amount")}>
                ← {t("p2p.back")}
              </Button>
              <Button
                onClick={() => {
                  if (!slipUrl) {
                    toast.error(t("p2p.payslipRequired"));
                    return;
                  }
                  setStep("confirm");
                }}
                disabled={!slipUrl}
                className="font-semibold"
              >
                {t("p2p.continue")} →
              </Button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-elevated/60 p-4 space-y-3 text-sm">
              <Row label={t("p2p.orderType")} value={isBuy ? t("p2p.buyTab") : t("p2p.sellTab")} />
              <Row label={t("p2p.youSend")} value={fmtKyat(amt)} />
              <Row
                label={`${t("p2p.commission")} (${agent.commissionRate}%)`}
                value={`-${fmtKyat(commission)}`}
                valueClass="text-no"
              />
              <Row
                label={t("p2p.youReceive")}
                value={fmtKyat(net)}
                valueClass="text-yes font-bold text-base"
              />
              <div className="border-t border-border/40 pt-3">
                <Row label={t("p2p.agent")} value={agent.name} />
                <Row
                  label={t("p2p.paymentVia")}
                  value={selectedMethod?.type.name ?? selectedMethod?.name ?? "—"}
                />
                {selectedMethod && (
                  <Row label={t("p2p.paymentAccountAddress")} value={selectedMethod.address} />
                )}
                <Row
                  label={t("p2p.responseTime")}
                  value={
                    agent.responseTime === "—" ? t("p2p.noProcessingData") : agent.responseTime
                  }
                />
                {isBuy && slipUrl && (
                  <Row label={t("p2p.payslipLabel")} value={t("p2p.payslipAttached")} />
                )}
              </div>
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-muted-foreground">
              💡 {isBuy ? t("p2p.depositNote") : t("p2p.withdrawNote")}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={goBackFromConfirm}>
                ← {t("p2p.back")}
              </Button>
              <Button onClick={handlePlace} disabled={submitM.isPending} className="font-semibold">
                {submitM.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("p2p.placing") || "Sending…"}
                  </>
                ) : (
                  t("p2p.confirmOrder")
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yes/15">
              <CheckCircle2 className="h-8 w-8 text-yes" />
            </div>
            <div>
              <div className="text-lg font-bold">{t("p2p.orderPlaced")}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {t("p2p.orderPlacedNote", {
                  name: agent.name,
                })}
              </div>
            </div>
            <div className="w-full rounded-lg bg-elevated/60 px-4 py-3 text-sm text-left space-y-1">
              <Row label={t("p2p.contactAgent")} value={agent.name} />
              <Row
                label={t("p2p.paymentMethod")}
                value={selectedMethod?.type.name ?? selectedMethod?.name ?? "—"}
              />
              {selectedMethod && (
                <Row label={t("p2p.paymentAccountAddress")} value={selectedMethod.address} />
              )}
              <Row label={t("p2p.netAmount")} value={fmtKyat(net)} valueClass="text-yes" />
            </div>
            <Button className="w-full" onClick={handleClose}>
              {t("p2p.done")}
            </Button>
          </div>
        )}
      </DialogContent>

      <PaymentMethodFormDialog
        open={addPaymentOpen}
        mode="create"
        method={null}
        nested
        excludeCryptoTypes
        onOpenChange={setAddPaymentOpen}
        onSuccess={() => setAddPaymentOpen(false)}
        onCreated={(m) => {
          setSelectedMethodId(m.id);
          qc.invalidateQueries({ queryKey: ["payment-methods", "me"] });
        }}
      />
    </Dialog>
  );
}

function toPaymentOption(m: ApiPaymentMethod | ApiAgentPaymentMethod): PaymentMethodOption {
  return {
    id: m.id,
    name: m.name,
    address: m.address,
    is_default: m.is_default,
    type: m.type,
  };
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span
        className={cn("font-medium tabular-nums break-all text-right sm:max-w-[60%]", valueClass)}
      >
        {value}
      </span>
    </div>
  );
}
