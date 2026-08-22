import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertCircle, Info, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { walletFundingApi, WALLET_FUNDING_QUERY_KEY } from "@/lib/api/walletFunding";
import type { ApiWalletFundingRequest, WalletFundingStatus } from "@/lib/api/types";
import { fmtKyat } from "@/lib/format";
import { toast } from "sonner";

const STATUS_VARIANT: Record<WalletFundingStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  cancelled: "outline",
};

export function FundingRequestsSection({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const listQ = useQuery({
    queryKey: [WALLET_FUNDING_QUERY_KEY, "me"],
    queryFn: () => walletFundingApi.listMine({ limit: 50 }),
  });

  const cancelM = useMutation({
    mutationFn: (id: string) => walletFundingApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WALLET_FUNDING_QUERY_KEY] });
      toast.success(t("wallet.funding.cancelled"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = listQ.data?.items ?? [];

  if (listQ.isLoading) {
    return (
      <div className="flex justify-center py-10" role="status" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="sr-only">{t("wallet.funding.loading")}</span>
      </div>
    );
  }

  if (listQ.isError) {
    return (
      <p className="py-6 text-center text-sm text-destructive" role="alert">
        {(listQ.error as Error).message || t("wallet.funding.loadError")}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {t("wallet.funding.empty")}
      </p>
    );
  }

  return (
    <div className={embedded ? "" : "rounded-xl border p-4"}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("wallet.funding.colType")}</TableHead>
            <TableHead className="text-right">{t("wallet.funding.colAmount")}</TableHead>
            <TableHead>{t("wallet.funding.colStatus")}</TableHead>
            <TableHead className="text-right">{t("wallet.funding.colDate")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => (
            <FundingRow
              key={row.id}
              row={row}
              onCancel={(id) => cancelM.mutate(id)}
              cancelling={cancelM.isPending}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function FundingRow({
  row,
  onCancel,
  cancelling,
}: {
  row: ApiWalletFundingRequest;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  const { t } = useTranslation();
  const displayAmount = row.approved_amount ?? row.amount;

  return (
    <TableRow>
      <TableCell className="capitalize">{t(`wallet.funding.type_${row.type}`)}</TableCell>
      <TableCell className="text-right font-mono">{fmtKyat(Number(displayAmount))}</TableCell>
      <TableCell>
        <FundingStatusCell row={row} />
      </TableCell>
      <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
        {new Date(row.created_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </TableCell>
      <TableCell className="text-right">
        {row.status === "pending" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={cancelling}
            onClick={() => onCancel(row.id)}
          >
            {t("wallet.funding.cancel")}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function FundingStatusCell({ row }: { row: ApiWalletFundingRequest }) {
  const { t } = useTranslation();
  const [reasonOpen, setReasonOpen] = useState(false);
  const reason = row.reject_reason?.trim();

  return (
    <div className="space-y-2">
      <Badge variant={STATUS_VARIANT[row.status]} className="capitalize">
        {t(`wallet.funding.status_${row.status}`)}
      </Badge>

      {row.status === "rejected" && reason && (
        <>
          <div
            className="rounded-lg border border-destructive/25 bg-destructive/5 p-2.5 text-left"
            role="note"
            aria-label={`${t("wallet.funding.rejectReasonLabel")}: ${reason}`}
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive">
                  {t("wallet.funding.rejectReasonLabel")}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-foreground">{reason}</p>
                {reason.length > 72 && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="mt-1 h-auto p-0 text-destructive"
                    onClick={() => setReasonOpen(true)}
                    aria-haspopup="dialog"
                  >
                    {t("wallet.funding.viewRejectReason")}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Dialog open={reasonOpen} onOpenChange={setReasonOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t("wallet.funding.rejectReasonTitle")}</DialogTitle>
                <DialogDescription className="capitalize">
                  {t(`wallet.funding.type_${row.type}`)} · {fmtKyat(Number(row.amount))}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{reason}</p>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {row.status === "pending" && row.type === "withdraw" && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{t("wallet.funding.withdrawHoldHint")}</span>
        </p>
      )}
    </div>
  );
}
