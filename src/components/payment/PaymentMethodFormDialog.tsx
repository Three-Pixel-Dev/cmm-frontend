import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { paymentMethodsApi } from "@/lib/api/paymentMethods";
import { paymentMethodTypesApi } from "@/lib/api/paymentMethodTypes";
import { isCryptoPaymentType } from "@/lib/p2p/paymentMethods";
import type { ApiPaymentMethod } from "@/lib/api/types";

export type PaymentMethodFormMode = "create" | "edit";

export function PaymentMethodFormDialog({
  open,
  mode,
  method,
  nested,
  excludeCryptoTypes = false,
  onOpenChange,
  onSuccess,
  onCreated,
}: {
  open: boolean;
  mode: PaymentMethodFormMode;
  method: ApiPaymentMethod | null;
  nested?: boolean;
  excludeCryptoTypes?: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onCreated?: (method: ApiPaymentMethod) => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const formId = useId();
  const typeFieldId = `${formId}-type`;
  const nameId = `${formId}-name`;
  const addressId = `${formId}-address`;
  const defaultId = `${formId}-default`;

  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [addressError, setAddressError] = useState("");

  const typesQ = useQuery({
    queryKey: ["payment-method-types"],
    queryFn: () => paymentMethodTypesApi.list(),
    enabled: open,
  });
  const types = (typesQ.data ?? []).filter(
    (type) => !excludeCryptoTypes || !isCryptoPaymentType(type.name),
  );
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;

    if (mode === "edit" && method) {
      setSelectedTypeId(method.payment_method_type_id);
      setName(method.name ?? "");
      setAddress(method.address);
      setIsDefault(method.is_default);
    } else {
      setName("");
      setAddress("");
      setIsDefault(false);
      setSelectedTypeId("");
    }
    setAddressError("");
  }, [open, mode, method]);

  // Apply default type once types load — must not depend on `types` in the reset
  // effect above (that array is recreated every render and would wipe typed input).
  useEffect(() => {
    if (!open || mode === "edit") return;
    const firstId = types[0]?.id;
    if (firstId) {
      setSelectedTypeId((prev) => prev || firstId);
    }
  }, [open, mode, typesQ.data]);

  const saveM = useMutation({
    mutationFn: async () => {
      const trimmedAddress = address.trim();
      const trimmedName = name.trim();
      if (!selectedTypeId) throw new Error("Select a payment type");
      if (mode === "create") {
        return paymentMethodsApi.create({
          payment_method_type_id: selectedTypeId,
          address: trimmedAddress,
          name: trimmedName || undefined,
          is_default: isDefault || undefined,
        });
      }
      if (!method) throw new Error("Missing payment method");
      return paymentMethodsApi.update(method.id, {
        payment_method_type_id: selectedTypeId,
        address: trimmedAddress,
        name: trimmedName || undefined,
        is_default: isDefault,
      });
    },
    onSuccess: (saved) => {
      toast.success(mode === "create" ? t("payment.added") : t("payment.updated"));
      qc.invalidateQueries({ queryKey: ["payment-methods", "me"] });
      if (mode === "create" && saved) onCreated?.(saved);
      onSuccess();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      setAddressError(t("payment.addressRequired"));
      return;
    }
    setAddressError("");
    saveM.mutate();
  };

  const title = mode === "create" ? t("payment.addTitle") : t("payment.editTitle");
  const description = mode === "create" ? t("payment.addDesc") : t("payment.editDesc");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent nested={nested} className="sm:max-w-md" aria-describedby={`${formId}-desc`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription id={`${formId}-desc`}>{description}</DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={typeFieldId}>{t("payment.type")}</Label>
              {typesQ.isLoading ? (
                <div className="flex h-10 items-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : types.length === 0 ? (
                <p className="text-xs text-muted-foreground">No payment types available.</p>
              ) : (
                <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                  <SelectTrigger id={typeFieldId} aria-required="true">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <span className="inline-flex items-center gap-2">
                          {type.photo_url && (
                            <img
                              src={type.photo_url}
                              alt=""
                              className="h-4 w-4 rounded-sm object-cover"
                            />
                          )}
                          {type.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={nameId}>{t("payment.label")}</Label>
              <Input
                id={nameId}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("payment.labelPlaceholder")}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={addressId}>{t("payment.address")}</Label>
            <Input
              id={addressId}
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (addressError) setAddressError("");
              }}
              placeholder="0x…"
              className="font-mono"
              aria-required="true"
              aria-invalid={!!addressError}
              aria-describedby={addressError ? `${addressId}-error` : undefined}
              autoComplete="off"
            />
            {addressError && (
              <p id={`${addressId}-error`} className="text-sm text-destructive" role="alert">
                {addressError}
              </p>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-elevated/30 p-3">
            <Checkbox
              id={defaultId}
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(checked === true)}
              aria-describedby={`${defaultId}-hint`}
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor={defaultId} className="cursor-pointer font-medium">
                {t("payment.setAsDefault")}
              </Label>
              <p id={`${defaultId}-hint`} className="text-xs text-muted-foreground">
                {t("payment.defaultHint")}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveM.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="font-semibold" disabled={saveM.isPending}>
              {saveM.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  <span>{t("common.loading")}</span>
                </>
              ) : mode === "create" ? (
                t("payment.save")
              ) : (
                t("payment.saveChanges")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
