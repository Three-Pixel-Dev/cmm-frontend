import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { paymentMethodsApi } from "@/lib/api/paymentMethods";
import type { ApiPaymentMethod } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { PaymentMethodFormDialog } from "@/components/payment/PaymentMethodFormDialog";

type FormMode = "create" | "edit";

function PaymentMethodRow({
  method: m,
  defaultPending,
  onEdit,
  onSetDefault,
  onDelete,
}: {
  method: ApiPaymentMethod;
  defaultPending: boolean;
  onEdit: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  const addressId = useId();
  const label = m.name || m.type.name;

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border/60 bg-elevated/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          <span className="inline-flex items-center gap-1 rounded bg-elevated px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
            {m.type.photo_url && (
              <img src={m.type.photo_url} alt="" className="h-3.5 w-3.5 rounded-sm object-cover" />
            )}
            {m.type.name}
          </span>
          {m.is_default && (
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {t("payment.default")}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <p
            id={addressId}
            className={cn(
              "font-mono text-xs text-muted-foreground",
              revealed ? "break-all" : "truncate",
            )}
            title={revealed ? m.address : undefined}
          >
            {revealed ? (
              m.address
            ) : (
              <span aria-hidden>{"•".repeat(12)}</span>
            )}
            {!revealed && <span className="sr-only">{t("payment.addressHidden")}</span>}
          </p>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0 text-muted-foreground"
            aria-pressed={revealed}
            aria-controls={addressId}
            aria-label={
              revealed
                ? t("payment.hideAddressAria", { name: label })
                : t("payment.showAddressAria", { name: label })
            }
            onClick={() => setRevealed((v) => !v)}
          >
            {revealed ? (
              <EyeOff className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Eye className="h-3.5 w-3.5" aria-hidden />
            )}
          </Button>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 self-end sm:self-auto">
        <Button
          size="icon"
          variant="ghost"
          aria-label={t("payment.editAria", { name: label })}
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </Button>
        {!m.is_default && (
          <Button
            size="icon"
            variant="ghost"
            aria-label={t("payment.setDefaultAria", { name: label })}
            onClick={onSetDefault}
            disabled={defaultPending}
          >
            <Star className="h-4 w-4" aria-hidden />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          aria-label={t("payment.removeAria", { name: label })}
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </li>
  );
}

export function PaymentMethodsSection({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingMethod, setEditingMethod] = useState<ApiPaymentMethod | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiPaymentMethod | null>(null);

  const methodsQ = useQuery({
    queryKey: ["payment-methods", "me"],
    queryFn: () => paymentMethodsApi.listMine(),
  });

  const removeM = useMutation({
    mutationFn: (id: string) => paymentMethodsApi.remove(id),
    onSuccess: () => {
      toast.success(t("payment.removed"));
      qc.invalidateQueries({ queryKey: ["payment-methods", "me"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const defaultM = useMutation({
    mutationFn: (id: string) => paymentMethodsApi.update(id, { is_default: true }),
    onSuccess: () => {
      toast.success(t("payment.defaultSet"));
      qc.invalidateQueries({ queryKey: ["payment-methods", "me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setFormMode("create");
    setEditingMethod(null);
    setFormOpen(true);
  };

  const openEdit = (method: ApiPaymentMethod) => {
    setFormMode("edit");
    setEditingMethod(method);
    setFormOpen(true);
  };

  const methods = methodsQ.data ?? [];

  return (
    <>
      <div className={cn(!embedded && "rounded-2xl border border-border/60 bg-card p-6")}>
        {!embedded && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{t("payment.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("payment.subtitle")}</p>
            </div>
            <Button size="sm" variant="outline" onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              {t("payment.add")}
            </Button>
          </div>
        )}
        {embedded && (
          <div className="mb-4 flex justify-end">
            <Button size="sm" variant="outline" onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              {t("payment.add")}
            </Button>
          </div>
        )}

        {methodsQ.isLoading ? (
          <div className="flex justify-center py-8" role="status" aria-live="polite">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="sr-only">{t("common.loading")}</span>
          </div>
        ) : methods.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 py-10 text-center">
            <p className="text-sm text-muted-foreground">{t("payment.empty")}</p>
            <Button size="sm" className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              {t("payment.addFirst")}
            </Button>
          </div>
        ) : (
          <ul className="space-y-2" aria-label={t("payment.title")}>
            {methods.map((m) => (
              <PaymentMethodRow
                key={m.id}
                method={m}
                defaultPending={defaultM.isPending}
                onEdit={() => openEdit(m)}
                onSetDefault={() => defaultM.mutate(m.id)}
                onDelete={() => setDeleteTarget(m)}
              />
            ))}
          </ul>
        )}
      </div>

      <PaymentMethodFormDialog
        open={formOpen}
        mode={formMode}
        method={editingMethod}
        onOpenChange={setFormOpen}
        onSuccess={() => {
          setFormOpen(false);
          setEditingMethod(null);
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("payment.removeConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("payment.removeConfirmDesc", {
                name: deleteTarget?.name || deleteTarget?.type.name || "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && (
            <p className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground break-all">
              {deleteTarget.address}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeM.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
              disabled={removeM.isPending || !deleteTarget}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) removeM.mutate(deleteTarget.id);
              }}
            >
              {removeM.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  <span className="sr-only">{t("common.loading")}</span>
                </>
              ) : (
                t("payment.remove")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
