import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link2, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { affiliateApi, AFFILIATE_EARNINGS_QUERY_KEY } from "@/lib/api/affiliate";
import { fmtDate, fmtKyat, fmtLedger, type LedgerKind } from "@/lib/format";
import { cn } from "@/lib/utils";

const SCROLL_TABLE_CLASS = "h-[min(28rem,48vh)] border rounded-md";

export function AffiliateEarningsSection({
  userId,
  embedded = false,
}: {
  userId: string;
  embedded?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const locale = i18n.language === "my" ? "my" : "en";

  const earningsQ = useQuery({
    queryKey: [AFFILIATE_EARNINGS_QUERY_KEY, userId],
    queryFn: () => affiliateApi.listMyEarnings({ page: 1, limit: 200 }),
    enabled: !!userId,
  });

  const items = useMemo(() => earningsQ.data?.items ?? [], [earningsQ.data?.items]);
  const totalEarned = earningsQ.data?.total_earned ?? 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (row) =>
        row.market_title_en.toLowerCase().includes(q) ||
        row.market_item_title_en.toLowerCase().includes(q) ||
        row.market_id.toLowerCase().includes(q),
    );
  }, [items, search]);

  const formatEarning = (amount: number, ledger: LedgerKind) =>
    fmtLedger(amount, ledger, { digits: 0 });

  const body = (
    <>
      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          embedded ? "mb-3" : "mb-4",
        )}
      >
        {!embedded && (
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" aria-hidden />
            <div>
              <h2 id="wallet-affiliate-earnings-heading" className="text-lg font-semibold">
                {t("wallet.affiliateEarnings")}
              </h2>
              <p className="text-xs text-muted-foreground">{t("wallet.affiliateEarningsHint")}</p>
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
            placeholder={t("wallet.affiliateSearchPlaceholder")}
            className="pl-9"
            aria-label={t("wallet.affiliateSearchPlaceholder")}
          />
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("wallet.affiliateTotalEarned")}
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
          {earningsQ.isLoading ? "—" : fmtKyat(totalEarned)}
        </p>
      </div>

      {earningsQ.isPending ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">{t("wallet.affiliateLoading")}</p>
        </div>
      ) : earningsQ.isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          {t("wallet.affiliateLoadError")}
        </p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {search.trim() ? t("wallet.affiliateNoResults") : t("wallet.affiliateEmpty")}
        </p>
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {filtered.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-border/60 bg-elevated/30 p-3 text-sm"
              >
                <p className="font-medium leading-snug">{row.market_title_en || "—"}</p>
                <p className="mt-1 text-xs text-muted-foreground truncate">
                  {row.market_item_title_en || "—"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant={row.bet_side === "yes" ? "default" : "destructive"}
                    className="capitalize"
                  >
                    {row.bet_side}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="font-mono text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatEarning(row.payout_amount, row.ledger)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(row.created_at, locale)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <ScrollArea className={cn(SCROLL_TABLE_CLASS, "hidden md:block")}>
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                <TableRow>
                  <TableHead>{t("wallet.affiliateColMarket")}</TableHead>
                  <TableHead>{t("wallet.affiliateColItem")}</TableHead>
                  <TableHead>{t("wallet.affiliateColBetSide")}</TableHead>
                  <TableHead className="text-right">{t("wallet.affiliateColEarning")}</TableHead>
                  <TableHead className="text-right">{t("wallet.colDate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[160px] truncate font-medium">
                      {row.market_title_en || "—"}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate">
                      {row.market_item_title_en || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.bet_side === "yes" ? "default" : "destructive"}
                        className="capitalize"
                      >
                        {row.bet_side}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatEarning(row.payout_amount, row.ledger)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {fmtDate(row.created_at, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </>
      )}
    </>
  );

  if (embedded) {
    return <section aria-label={t("wallet.affiliateEarnings")}>{body}</section>;
  }

  return (
    <section
      aria-labelledby="wallet-affiliate-earnings-heading"
      className="rounded-2xl border border-border/60 bg-card p-6"
    >
      {body}
    </section>
  );
}
