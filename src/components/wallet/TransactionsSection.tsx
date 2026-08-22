import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, Copy, Loader2, ReceiptText, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { fmtDate, fmtKyat } from "@/lib/format";
import { transactionsApi, TRANSACTIONS_QUERY_KEY } from "@/lib/api/transactions";
import type {
  ApiTransaction,
  TransactionStatus,
  TransactionType,
} from "@/lib/api/types";

const STATUS_STYLES: Record<TransactionStatus, string> = {
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  fail: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const SCROLL_TABLE_CLASS = "h-[min(28rem,48vh)] border rounded-md";

function resolveTransactionTypeLabel(
  tx: ApiTransaction,
  labels: Record<TransactionType, string> & { withdrawHold: string },
): string {
  if (tx.type === "withdraw" && tx.status === "pending" && tx.source_type === "WALLET_FUNDING") {
    return labels.withdrawHold;
  }
  return labels[tx.type as TransactionType] ?? tx.type;
}

function resolveSourceLabel(tx: ApiTransaction, walletFundingLabel: string): string {
  if (tx.source_type === "WALLET_FUNDING") return walletFundingLabel;
  return tx.source_type;
}

export function TransactionsSection({
  userId,
  embedded = false,
}: {
  userId: string;
  embedded?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");

  const txQ = useQuery({
    queryKey: [TRANSACTIONS_QUERY_KEY, userId],
    queryFn: () => transactionsApi.listByUser(userId, { limit: 200 }),
    enabled: !!userId,
  });

  const items = useMemo(() => txQ.data?.items ?? [], [txQ.data?.items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (tx) =>
        tx.id.toLowerCase().includes(q) ||
        (tx.source_id?.toLowerCase().includes(q) ?? false),
    );
  }, [items, search]);

  const typeLabels: Record<TransactionType, string> = {
    deposit: t("wallet.typeDeposit"),
    withdraw: t("wallet.typeWithdraw"),
    sell: t("wallet.typeSell"),
    transfer: t("wallet.typeTransfer"),
    refund: t("wallet.typeRefund"),
  };
  const withdrawHoldLabel = t("wallet.typeWithdrawHold");
  const walletFundingSourceLabel = t("wallet.sourceWalletFunding");
  const statusLabels: Record<TransactionStatus, string> = {
    pending: t("wallet.statusPending"),
    success: t("wallet.statusSuccess"),
    fail: t("wallet.statusFail"),
  };
  const locale = i18n.language === "my" ? "my" : "en";

  const body = (
    <>
      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          !embedded && "mb-5",
        )}
      >
        {!embedded && (
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" aria-hidden />
            <div>
              <h2 id="wallet-transactions-heading" className="text-lg font-semibold">
                {t("wallet.transactions")}
              </h2>
              <p className="text-xs text-muted-foreground">{t("wallet.transactionsHint")}</p>
            </div>
          </div>
        )}
        <div className={cn("relative w-full", embedded ? "" : "sm:w-72")}>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("wallet.searchPlaceholder")}
            aria-label={t("wallet.searchPlaceholder")}
            className="pl-9"
          />
        </div>
      </div>

      <div className={embedded ? "mt-3" : undefined}>
        {txQ.isLoading && (
          <div className="flex justify-center py-12" role="status" aria-live="polite">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" aria-hidden />
            <span className="sr-only">{t("wallet.transactions")}</span>
          </div>
        )}

        {txQ.isError && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <p className="text-destructive">
              {(txQ.error as Error)?.message ?? t("wallet.loadError")}
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => txQ.refetch()}>
              {t("wallet.retry")}
            </Button>
          </div>
        )}

        {!txQ.isLoading && !txQ.isError && filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {search.trim() ? t("wallet.noResults") : t("wallet.noTransactions")}
          </p>
        )}

        {!txQ.isLoading && !txQ.isError && filtered.length > 0 && (
          <>
            <ul className="space-y-3 md:hidden">
              {filtered.map((tx) => (
                <TransactionMobileCard
                  key={tx.id}
                  tx={tx}
                  typeLabel={resolveTransactionTypeLabel(tx, { ...typeLabels, withdrawHold: withdrawHoldLabel })}
                  statusLabel={statusLabels[tx.status]}
                  sourceLabel={resolveSourceLabel(tx, walletFundingSourceLabel)}
                  locale={locale}
                  copyLabel={t("wallet.copyId")}
                  copiedMsg={t("wallet.copied")}
                  copyFailedMsg={t("wallet.copyFailed")}
                />
              ))}
            </ul>
            <ScrollArea className={cn(SCROLL_TABLE_CLASS, "hidden md:block")}>
            <Table>
              <caption className="sr-only">{t("wallet.transactions")}</caption>
              <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                <TableRow>
                  <TableHead>{t("wallet.colId")}</TableHead>
                  <TableHead>{t("wallet.colType")}</TableHead>
                  <TableHead className="text-right">{t("wallet.colAmount")}</TableHead>
                  <TableHead>{t("wallet.colStatus")}</TableHead>
                  <TableHead>{t("wallet.colSource")}</TableHead>
                  <TableHead className="text-right whitespace-nowrap">{t("wallet.colDate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    typeLabel={resolveTransactionTypeLabel(tx, { ...typeLabels, withdrawHold: withdrawHoldLabel })}
                    statusLabel={statusLabels[tx.status]}
                    sourceLabel={resolveSourceLabel(tx, walletFundingSourceLabel)}
                    locale={locale}
                    copyLabel={t("wallet.copyId")}
                    copiedMsg={t("wallet.copied")}
                    copyFailedMsg={t("wallet.copyFailed")}
                  />
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          </>
        )}
      </div>
    </>
  );

  if (embedded) {
    return (
      <section aria-label={t("wallet.transactions")}>
        {body}
      </section>
    );
  }

  return (
    <section
      aria-labelledby="wallet-transactions-heading"
      className="rounded-2xl border border-border/60 bg-card p-6"
    >
      {body}
    </section>
  );
}

function TransactionMobileCard({
  tx,
  typeLabel,
  statusLabel,
  sourceLabel,
  locale,
  copyLabel,
  copiedMsg,
  copyFailedMsg,
}: {
  tx: ApiTransaction;
  typeLabel: string;
  statusLabel: string;
  sourceLabel: string;
  locale: string;
  copyLabel: string;
  copiedMsg: string;
  copyFailedMsg: string;
}) {
  const [copied, setCopied] = useState(false);
  const isCredit = tx.tran_type === "credit";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tx.id);
      setCopied(true);
      toast.success(copiedMsg);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(copyFailedMsg);
    }
  };

  return (
    <li className="rounded-xl border border-border/60 bg-elevated/30 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{typeLabel}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{fmtDate(tx.created_at, locale)}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            STATUS_STYLES[tx.status],
          )}
        >
          {statusLabel}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-base font-semibold tabular-nums",
            isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
          )}
        >
          {isCredit ? "+" : "−"}
          {fmtKyat(Number(tx.amount))}
        </span>
        <span className="text-xs uppercase text-muted-foreground">{sourceLabel}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          {tx.id.slice(0, 8)}…{tx.id.slice(-4)}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={`${copyLabel}: ${tx.id}`}
          className="rounded p-1 text-muted-foreground hover:bg-accent"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </li>
  );
}

function TransactionRow({
  tx,
  typeLabel,
  statusLabel,
  sourceLabel,
  locale,
  copyLabel,
  copiedMsg,
  copyFailedMsg,
}: {
  tx: ApiTransaction;
  typeLabel: string;
  statusLabel: string;
  sourceLabel: string;
  locale: string;
  copyLabel: string;
  copiedMsg: string;
  copyFailedMsg: string;
}) {
  const [copied, setCopied] = useState(false);
  const isCredit = tx.tran_type === "credit";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tx.id);
      setCopied(true);
      toast.success(copiedMsg);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(copyFailedMsg);
    }
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs" title={tx.id}>
            {tx.id.slice(0, 8)}…{tx.id.slice(-4)}
          </code>
          <button
            type="button"
            onClick={copy}
            aria-label={`${copyLabel}: ${tx.id}`}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        </div>
      </TableCell>
      <TableCell>{typeLabel}</TableCell>
      <TableCell className="text-right tabular-nums">
        <span className={cn(isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
          {isCredit ? "+" : "−"}
          {fmtKyat(Number(tx.amount))}
        </span>
      </TableCell>
      <TableCell>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            STATUS_STYLES[tx.status],
          )}
        >
          {statusLabel}
        </span>
      </TableCell>
      <TableCell className="text-xs uppercase text-muted-foreground">{sourceLabel}</TableCell>
      <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
        {fmtDate(tx.created_at, locale)}
      </TableCell>
    </TableRow>
  );
}
