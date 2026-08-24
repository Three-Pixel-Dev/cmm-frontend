import { betsApi } from "@/lib/api/bets";
import { marketItemsApi } from "@/lib/api/markets";
import {
  potentialProfitForBet,
  bettingHistoryAnswerLabel,
} from "@/lib/markets/bettingHistoryProfit";
import type { ApiMarketItem } from "@/types/market-api";
import type { ApiBettingHistory } from "@/types/bet-api";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ReceiptText } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { fmtDate, fmtLedger, type LedgerKind } from "@/lib/format";
import { cn } from "@/lib/utils";

const SCROLL_TABLE_CLASS = "h-[min(28rem,48vh)] border rounded-md";

function useBettingHistories(userId: string) {
  return useQuery({
    queryKey: ["betting-histories", "userId", userId],
    queryFn: async () => {
      const result = await betsApi.list({
        page: 1,
        limit: 200,
        user_id: userId,
      });
      return result.items;
    },
  });
}

function useMarketItemsForBets(histories: ApiBettingHistory[] | undefined) {
  const itemIds = useMemo(() => {
    if (!histories?.length) return [];
    return [...new Set(histories.map((h) => h.market_item_id))];
  }, [histories]);

  const queries = useQueries({
    queries: itemIds.map((id) => ({
      queryKey: ["market-item", id],
      queryFn: () => marketItemsApi.get(id),
      staleTime: 30_000,
    })),
  });

  const itemById = useMemo(() => {
    const map = new Map<string, ApiMarketItem>();
    itemIds.forEach((id, index) => {
      const data = queries[index]?.data;
      if (data) map.set(id, data);
    });
    return map;
  }, [itemIds, queries]);

  const isLoadingItems = queries.some((q) => q.isLoading);

  return { itemById, isLoadingItems };
}

function ProfitCell({
  history,
  item,
  itemsLoading,
}: {
  history: ApiBettingHistory;
  item?: ApiMarketItem;
  itemsLoading: boolean;
}) {
  const { t } = useTranslation();
  const ledger = history.ledger as LedgerKind;

  if (history.status && history.status !== "active") {
    return <span className="text-muted-foreground">{t("wallet.bettingProfitSettled")}</span>;
  }

  if (itemsLoading && !item) {
    return <span className="text-muted-foreground">{t("wallet.bettingProfitPending")}</span>;
  }

  const profit = potentialProfitForBet(history, item);
  if (profit == null) {
    return <span className="text-muted-foreground">{t("wallet.bettingProfitClosed")}</span>;
  }

  return (
    <span
      className={cn("font-mono font-medium tabular-nums", profit >= 0 ? "text-yes" : "text-no")}
    >
      {profit !== 0
        ? `~${fmtLedger(profit, ledger, { digits: 2 })}`
        : fmtLedger(0, ledger, { digits: 2 })}
    </span>
  );
}

export const BettingHistoriesSection = ({
  userId,
  embedded = false,
}: {
  userId: string;
  embedded?: boolean;
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "my" ? "my" : "en";

  const { data: histories, isPending } = useBettingHistories(userId);
  const { itemById, isLoadingItems } = useMarketItemsForBets(histories);

  const body = (
    <>
      {!embedded && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" aria-hidden />
            <div>
              <h2 id="betting-histories-heading" className="text-lg font-semibold">
                {t("wallet.histories")}
              </h2>
              <p className="text-xs text-muted-foreground">{t("wallet.historiesHint")}</p>
            </div>
          </div>
        </div>
      )}

      {isPending ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">{t("wallet.historiesLoading")}</p>
        </div>
      ) : !histories || histories.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          {t("wallet.historiesEmpty")}
        </div>
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {histories.map((history) => {
              const item = itemById.get(history.market_item_id);
              const answerLabel = bettingHistoryAnswerLabel(history, item, locale);
              return (
                <li
                  key={history.id}
                  className="rounded-xl border border-border/60 bg-elevated/30 p-3 text-sm"
                >
                  <p className="font-medium leading-snug">{history.market_item?.title_en}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge
                      variant={history.side === "yes" ? "default" : "destructive"}
                      className="capitalize"
                    >
                      {answerLabel}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">{t("wallet.bettingColShares")}</p>
                      <p className="font-mono font-medium tabular-nums">
                        {history.shares.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">{t("wallet.colAmount")}</p>
                      <p className="font-mono font-medium tabular-nums">
                        {fmtLedger(history.amount, history.ledger as LedgerKind, { digits: 2 })}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">{t("wallet.bettingColProfit")}</p>
                      <ProfitCell history={history} item={item} itemsLoading={isLoadingItems} />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {fmtDate(history.created_at, locale)}
                  </p>
                </li>
              );
            })}
          </ul>
          <ScrollArea className={cn(SCROLL_TABLE_CLASS, "hidden md:block")}>
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                <TableRow>
                  <TableHead>{t("wallet.bettingColItem")}</TableHead>
                  <TableHead>{t("wallet.bettingColSide")}</TableHead>
                  <TableHead className="text-right">{t("wallet.bettingColShares")}</TableHead>
                  <TableHead className="text-right">{t("wallet.colAmount")}</TableHead>
                  <TableHead className="text-right">{t("wallet.bettingColProfit")}</TableHead>
                  <TableHead className="text-right">{t("wallet.colDate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {histories.map((history) => {
                  const item = itemById.get(history.market_item_id);
                  const answerLabel = bettingHistoryAnswerLabel(history, item, locale);
                  return (
                    <TableRow key={history.id}>
                      <TableCell className="max-w-[180px] truncate font-medium">
                        {history.market_item?.title_en}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={history.side === "yes" ? "default" : "destructive"}
                          className="capitalize"
                        >
                          {answerLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {history.shares.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium tabular-nums">
                        {fmtLedger(history.amount, history.ledger as LedgerKind, { digits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <ProfitCell history={history} item={item} itemsLoading={isLoadingItems} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                        {fmtDate(history.created_at, locale)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </>
      )}
    </>
  );

  if (embedded) {
    return <section aria-label={t("wallet.histories")}>{body}</section>;
  }

  return (
    <div
      aria-labelledby="betting-histories-heading"
      className={cn("rounded-2xl border border-border/60 bg-card p-6")}
    >
      {body}
    </div>
  );
};
