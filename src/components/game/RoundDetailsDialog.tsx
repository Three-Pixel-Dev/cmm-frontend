import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { betsApi } from "@/lib/api/bets";
import type { RoomMember } from "@/lib/api/rooms";
import type { ApiMarketItem } from "@/types/market-api";
import type { ApiBettingHistory } from "@/types/bet-api";
import { fmtDateTime, fmtKyat, fmtShares } from "@/lib/format";
import { stakeModeLabel } from "@/lib/rooms/copy";
import { bettingHistoryAnswerLabel } from "@/lib/markets/bettingHistoryProfit";
import { settleRoundBets, type BetResult } from "@/lib/markets/settlementPayouts";
import { cn } from "@/lib/utils";

function playerName(bet: ApiBettingHistory, members: RoomMember[]): string {
  const seated = members.find((m) => m.user_id === bet.user_id);
  return (
    seated?.user_name ||
    bet.user?.name ||
    bet.user?.fullname ||
    bet.user?.email ||
    "Player"
  );
}

function outcomeLabel(item: ApiMarketItem): string {
  if (item.status === "cancelled") return "Cancelled";
  if (item.status === "voided" || item.outcome === "void") return "Voided";
  if (item.winning_option_id && item.options?.length) {
    const opt = item.options.find((o) => o.id === item.winning_option_id);
    if (opt) return opt.title_en;
  }
  if (item.outcome) return item.outcome;
  if (item.status === "open") return "Open";
  return "Closed";
}

function resultLabel(result: BetResult, pending: boolean): string {
  if (pending) return "Open";
  if (result === "won") return "Won";
  if (result === "lost") return "Lost";
  if (result === "refunded") return "Refunded";
  return "Open";
}

export function RoundDetailsDialog({
  open,
  onOpenChange,
  item,
  members,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ApiMarketItem;
  members: RoomMember[];
}) {
  const betsQ = useQuery({
    queryKey: ["round-bets", item.id],
    queryFn: async () => {
      const result = await betsApi.list({
        page: 1,
        limit: 100,
        market_item_id: item.id,
        ledger: "real",
      });
      return result.items ?? [];
    },
    enabled: open,
  });

  const pool = item.real_pool;
  const options = [...(item.options ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const bets = betsQ.data ?? [];
  const staked = bets.reduce((sum, b) => sum + b.amount, 0);
  const settlements = settleRoundBets(bets, item);
  const pending = item.status === "open";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="hud-panel max-w-2xl text-foreground">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left">{item.title_en}</DialogTitle>
          <DialogDescription className="text-left text-xs uppercase tracking-wide">
            {stakeModeLabel(item.stake_mode)} · {fmtKyat(item.one_share_price)} / share ·{" "}
            {item.status}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Outcome" value={outcomeLabel(item)} />
          <Stat label="Pool" value={fmtKyat(pool?.total_pool ?? staked)} />
          <Stat label="Bets" value={String(betsQ.isLoading ? "—" : bets.length)} />
        </div>

        {options.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((opt, index) => {
              const won = item.winning_option_id === opt.id;
              const shares =
                opt.real_pool?.real_count ??
                (options.length === 2
                  ? index === 0
                    ? (pool?.real_yes_count ?? 0)
                    : (pool?.real_no_count ?? 0)
                  : 0);
              return (
                <div
                  key={opt.id}
                  className={cn(
                    "rounded-xl border border-white/10 bg-black/30 px-3 py-2",
                    won && "border-primary/50 bg-primary/10",
                  )}
                >
                  <p className="text-xs text-muted-foreground">
                    {opt.title_en}
                    {won ? " · winner" : ""}
                  </p>
                  <p className="font-display text-sm font-semibold">{fmtShares(shares)} shares</p>
                </div>
              );
            })}
          </div>
        ) : null}

        <dl className="grid gap-1 text-xs text-muted-foreground">
          <div className="flex justify-between gap-4">
            <dt>Opened</dt>
            <dd className="tabular-nums text-foreground">{fmtDateTime(item.start_time)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Closes</dt>
            <dd className="tabular-nums text-foreground">{fmtDateTime(item.close_time)}</dd>
          </div>
          {item.resolved_time ? (
            <div className="flex justify-between gap-4">
              <dt>Settled</dt>
              <dd className="tabular-nums text-foreground">{fmtDateTime(item.resolved_time)}</dd>
            </div>
          ) : null}
        </dl>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Player bets
          </h3>
          {betsQ.isLoading ? (
            <div className="flex min-h-24 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : betsQ.isError ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-4 text-center text-sm text-destructive">
              Could not load bets for this round.
            </p>
          ) : bets.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 px-3 py-6 text-center text-sm text-muted-foreground">
              No bets on this round.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead>Player</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Stake</TableHead>
                  <TableHead className="text-right">{pending ? "Est. payout" : "Payout"}</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bets.map((bet) => {
                  const settled = settlements.get(bet.id);
                  const result = settled?.result ?? "pending";
                  const payout = settled?.payout ?? 0;
                  const profit = settled?.profit ?? 0;
                  return (
                    <TableRow key={bet.id} className="border-white/10">
                      <TableCell className="font-medium">{playerName(bet, members)}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          {bettingHistoryAnswerLabel(bet, item)}
                          <Badge
                            className={cn(
                              "h-5 border-transparent px-1.5 text-[10px]",
                              result === "won" && "bg-primary/20 text-primary",
                              result === "lost" && "bg-destructive/20 text-destructive",
                              result === "refunded" && "bg-white/10 text-muted-foreground",
                              result === "pending" && "bg-white/10 text-muted-foreground",
                            )}
                          >
                            {resultLabel(result, pending)}
                          </Badge>
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {bet.shares.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtKyat(bet.amount)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {pending && payout > 0 ? `~${fmtKyat(payout)}` : fmtKyat(payout)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          profit > 0 && "text-yes",
                          profit < 0 && "text-no",
                          profit === 0 && "text-muted-foreground",
                        )}
                      >
                        {pending && profit !== 0
                          ? `~${profit > 0 ? "+" : ""}${fmtKyat(profit)}`
                          : `${profit > 0 ? "+" : ""}${fmtKyat(profit)}`}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-display text-sm font-semibold capitalize tracking-wide">{value}</p>
    </div>
  );
}
