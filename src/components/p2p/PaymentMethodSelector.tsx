import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type PaymentMethodOption = {
  id: string;
  name?: string;
  address: string;
  is_default?: boolean;
  type: {
    id: string;
    name: string;
    photo_url?: string;
  };
};

type PaymentMethodSelectorProps = {
  methods: PaymentMethodOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  helpText?: string;
  detailHint?: string;
};

export function PaymentMethodSelector({
  methods,
  selectedId,
  onSelect,
  helpText,
  detailHint,
}: PaymentMethodSelectorProps) {
  const { t } = useTranslation();
  const groupId = useId();
  const selected = methods.find((m) => m.id === selectedId);

  return (
    <div className="space-y-3">
      {helpText && (
        <p id={`${groupId}-help`} className="text-xs text-muted-foreground">
          {helpText}
        </p>
      )}
      <fieldset>
        <legend className="sr-only">{t("p2p.paymentMethod")}</legend>
        <div
          role="radiogroup"
          aria-describedby={helpText ? `${groupId}-help` : undefined}
          className="space-y-2"
        >
          {methods.map((method) => (
            <PaymentMethodOptionCard
              key={method.id}
              method={method}
              name={groupId}
              selected={selectedId === method.id}
              onSelect={() => onSelect(method.id)}
            />
          ))}
        </div>
      </fieldset>
      {selected && <PaymentMethodDetailPanel method={selected} hint={detailHint} />}
    </div>
  );
}

function PaymentMethodOptionCard({
  method,
  name,
  selected,
  onSelect,
}: {
  method: PaymentMethodOption;
  name: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const typeLabel = method.type.name || t("p2p.paymentMethod");
  const title = method.name?.trim() || typeLabel;

  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
        selected
          ? "border-primary bg-primary/5"
          : "border-border/60 bg-elevated/40 hover:border-primary/40",
      )}
    >
      <input
        type="radio"
        name={name}
        value={method.id}
        checked={selected}
        onChange={onSelect}
        className="mt-1 h-4 w-4 shrink-0 accent-primary"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          {method.type.photo_url ? (
            <img src={method.type.photo_url} alt="" className="h-5 w-5 rounded-sm object-cover" />
          ) : null}
          <span className="text-sm font-semibold">{title}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
            {typeLabel}
          </span>
          {method.is_default && (
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {t("payment.default")}
            </span>
          )}
        </span>
      </span>
      {selected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />}
    </label>
  );
}

export function PaymentMethodDetailPanel({
  method,
  hint,
  compact,
}: {
  method: PaymentMethodOption;
  hint?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const typeLabel = method.type.name || t("p2p.paymentMethod");
  const title = method.name?.trim() || typeLabel;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(method.address);
      setCopied(true);
      toast.success(t("p2p.paymentAddressCopied"));
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t("p2p.paymentAddressCopyFailed"));
    }
  };

  return (
    <section
      aria-label={t("p2p.paymentMethodDetails")}
      className={cn(
        "rounded-lg border border-primary/25 bg-primary/5",
        compact ? "px-3 py-2.5" : "px-3 py-3",
      )}
    >
      <p className="text-xs font-semibold text-foreground">{t("p2p.paymentMethodDetails")}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <dl className={cn("space-y-2", hint ? "mt-2" : "mt-1.5")}>
        <DetailRow label={t("p2p.paymentType")} value={typeLabel} />
        {method.name?.trim() && method.name.trim() !== typeLabel && (
          <DetailRow label={t("p2p.paymentAccountLabel")} value={method.name.trim()} />
        )}
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("p2p.paymentAccountAddress")}
          </dt>
          <dd className="mt-1 flex items-start gap-2">
            <code className="min-w-0 flex-1 break-all rounded bg-background/80 px-2 py-1.5 font-mono text-xs">
              {method.address}
            </code>
            <button
              type="button"
              onClick={copyAddress}
              aria-label={t("p2p.copyPaymentAddress")}
              className="shrink-0 rounded-md border border-border/60 bg-background p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {copied ? (
                <Check className="h-4 w-4 text-yes" aria-hidden />
              ) : (
                <Copy className="h-4 w-4" aria-hidden />
              )}
            </button>
          </dd>
        </div>
      </dl>
      {!compact && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          {t("p2p.paymentDetailFootnote", { name: title })}
        </p>
      )}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}
