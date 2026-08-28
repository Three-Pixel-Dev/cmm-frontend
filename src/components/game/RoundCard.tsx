import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { betsApi } from "@/lib/api/bets";
import { marketItemsApi } from "@/lib/api/markets";
import type { RoomMember } from "@/lib/api/rooms";
import { ROOM_MARKETS_KEY, ROOM_MEMBERS_KEY, ROOM_TABS_KEY } from "@/hooks/useRooms";
import type { ApiMarketGroup, ApiMarketItem } from "@/types/market-api";
import { fmtKyat } from "@/lib/format";
import { stakeModeLabel } from "@/lib/rooms/copy";
import { cn } from "@/lib/utils";
import { RoundDetailsDialog } from "@/components/game/RoundDetailsDialog";
import { EditQuestionDialog } from "@/components/game/EditQuestionDialog";

function firstOpenItem(group: ApiMarketGroup): ApiMarketItem | undefined {
  return (
    (group.market_items ?? []).find((item) => item.status === "open") ?? group.market_items?.[0]
  );
}

export function RoundCard({
  group,
  roomId,
  isHost,
  members = [],
}: {
  group: ApiMarketGroup;
  roomId: string;
  isHost: boolean;
  members?: RoomMember[];
}) {
  const qc = useQueryClient();
  const item = firstOpenItem(group);
  const [shares, setShares] = useState("1");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const options = item?.options ?? [];

  const betM = useMutation({
    mutationFn: (payload: { side?: "yes" | "no"; option_id?: string }) =>
      betsApi.place({
        market_item_id: item!.id,
        shares: Math.max(1, Number.parseInt(shares, 10) || 1),
        ledger: "real",
        idempotency_key: crypto.randomUUID(),
        ...payload,
      }),
    onSuccess: () => {
      toast.success("Bet locked in.");
      void qc.invalidateQueries({ queryKey: [ROOM_MARKETS_KEY, roomId] });
      void qc.invalidateQueries({ queryKey: [ROOM_MEMBERS_KEY, roomId] });
      void qc.invalidateQueries({ queryKey: [ROOM_TABS_KEY, roomId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resolveM = useMutation({
    mutationFn: (body: { outcome?: "yes" | "no" | "void"; winning_option_id?: string }) =>
      marketItemsApi.resolve(item!.id, body),
    onSuccess: () => {
      toast.success("Round resolved — settling.");
      void qc.invalidateQueries({ queryKey: [ROOM_MARKETS_KEY, roomId] });
      void qc.invalidateQueries({ queryKey: [ROOM_MEMBERS_KEY, roomId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelM = useMutation({
    mutationFn: () => marketItemsApi.cancel(item!.id),
    onSuccess: () => {
      toast.success("Round cancelled.");
      void qc.invalidateQueries({ queryKey: [ROOM_MARKETS_KEY, roomId] });
      void qc.invalidateQueries({ queryKey: [ROOM_MEMBERS_KEY, roomId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!item) return null;

  const open = item.status === "open";
  const binaryYesNo =
    options.length === 2 &&
    options.some((o) => o.title_en.toLowerCase() === "yes") &&
    options.some((o) => o.title_en.toLowerCase() === "no");
  const shareCount = Math.max(1, Number.parseInt(shares, 10) || 1);
  const cost = shareCount * item.one_share_price;

  return (
    <article className="hud-panel round-card space-y-4 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold leading-snug tracking-wide">
            {item.title_en || group.title_en}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            {stakeModeLabel(item.stake_mode)} · {fmtKyat(item.one_share_price)} / share ·{" "}
            {item.status}
          </p>
        </div>
        {isHost ? (
          <div className="flex items-center gap-2">
            {open ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 border-primary/30 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/20"
                onClick={() => setEditOpen(true)}
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit</span>
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant={open ? "outline" : "default"}
              onClick={() => setDetailsOpen(true)}
              className="h-8 text-xs"
            >
              Details
            </Button>
          </div>
        ) : null}
      </div>

      {open ? (
        <>
          <div className="flex items-center gap-2">
            <Input
              value={shares}
              onChange={(e) => setShares(e.target.value.replace(/[^\d]/g, ""))}
              className="h-10 w-20 font-mono"
              aria-label="Shares"
            />
            <span className="text-sm text-muted-foreground">{fmtKyat(cost)}</span>
          </div>
          <div className={cn("grid gap-2", options.length > 2 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")}>
            {binaryYesNo ? (
              <>
                <Button
                  type="button"
                  className="h-14 bg-yes font-display text-lg font-bold tracking-wide text-yes-foreground hover:bg-yes/90"
                  disabled={betM.isPending}
                  onClick={() => betM.mutate({ side: "yes" })}
                >
                  {betM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes"}
                </Button>
                <Button
                  type="button"
                  className="h-14 bg-no font-display text-lg font-bold tracking-wide text-no-foreground hover:bg-no/90"
                  disabled={betM.isPending}
                  onClick={() => betM.mutate({ side: "no" })}
                >
                  No
                </Button>
              </>
            ) : (
              options.map((opt) => (
                <Button
                  key={opt.id}
                  type="button"
                  variant="secondary"
                  className="h-14 flex-col gap-0.5 border border-white/10 font-display text-sm font-semibold tracking-wide hover:border-primary/50 hover:bg-primary/15"
                  disabled={betM.isPending}
                  onClick={() => betM.mutate({ option_id: opt.id })}
                >
                  <span className="truncate max-w-full">{opt.title_en}</span>
                </Button>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-primary/20 bg-elevated/40 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Settlement Status</p>
          <p className="mt-1 font-display text-base font-bold text-emerald-400">
            {options.find((o) => o.id === item.winning_option_id)
              ? `🏆 Winner: ${options.find((o) => o.id === item.winning_option_id)?.title_en}`
              : item.outcome
                ? `Outcome: ${item.outcome.toUpperCase()}`
                : "This round is closed."}
          </p>
        </div>
      )}

      {isHost && open ? (
        <div className="flex flex-wrap gap-2 border-t border-primary/15 pt-3">
          {binaryYesNo ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={resolveM.isPending}
                onClick={() => resolveM.mutate({ outcome: "yes" })}
              >
                Resolve Yes
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={resolveM.isPending}
                onClick={() => resolveM.mutate({ outcome: "no" })}
              >
                Resolve No
              </Button>
            </>
          ) : (
            options.map((opt) => (
              <Button
                key={opt.id}
                type="button"
                size="sm"
                variant="outline"
                disabled={resolveM.isPending}
                onClick={() => resolveM.mutate({ winning_option_id: opt.id })}
              >
                Resolve {opt.title_en}
              </Button>
            ))
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn("text-destructive")}
            disabled={cancelM.isPending}
            onClick={() => cancelM.mutate()}
          >
            Cancel
          </Button>
        </div>
      ) : null}

      {isHost ? (
        <>
          <RoundDetailsDialog
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
            item={item}
            members={members}
          />
          <EditQuestionDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            item={item}
            roomId={roomId}
          />
        </>
      ) : null}
    </article>
  );
}
