import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CreateRoundForm } from "@/components/game/CreateRoundForm";
import { RoundCard } from "@/components/game/RoundCard";
import { useHydrated } from "@/hooks/useHydrated";
import {
  useCollectRoomTabs,
  useRoom,
  useRoomMarkets,
  useRoomPreview,
  useRoomTabs,
} from "@/hooks/useRooms";
import { useWallet, parseWalletAmount } from "@/hooks/useWallet";
import { useAuth } from "@/store/useAuth";
import { fmtKyat } from "@/lib/format";

export const Route = createFileRoute("/r/$inviteCode_/table")({
  head: ({ params }) => ({
    meta: [{ title: `Table ${params.inviteCode} — SuperCash` }],
  }),
  component: RoomTablePage,
});

function RoomTablePage() {
  const { inviteCode } = Route.useParams();
  const hydrated = useHydrated();
  const user = useAuth((s) => s.user);
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const previewQ = useRoomPreview(inviteCode);
  const roomQ = useRoom(previewQ.data?.id, hydrated && isLoggedIn && !!previewQ.data?.id);
  const room = roomQ.data;
  const marketsQ = useRoomMarkets(room?.id, !!room?.is_member);
  const tabsQ = useRoomTabs(room?.id, !!room?.is_admin);
  const collectM = useCollectRoomTabs(room?.id);
  const { data: wallet } = useWallet(isLoggedIn ? user?.id : undefined);
  const chips = parseWalletAmount(room?.join_payment_mode === "free" ? wallet?.virtual_amount : wallet?.amount);

  if (!hydrated || previewQ.isLoading || (isLoggedIn && roomQ.isLoading && previewQ.data)) {
    return (
      <main className="game-shell flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!isLoggedIn || !room?.is_member) {
    return (
      <main className="game-shell mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Join the table first</h1>
        <p className="mt-2 text-sm text-muted-foreground">This felt is members only.</p>
        <Button asChild className="mt-6">
          <Link to="/r/$inviteCode" params={{ inviteCode }}>
            Back to lobby
          </Link>
        </Button>
      </main>
    );
  }

  const groups = marketsQ.data?.items ?? [];
  const pendingTabs = (tabsQ.data ?? []).filter(
    (t) => t.status === "pending" || t.status === "overdue",
  );

  return (
    <main className="game-shell">
      <div className="game-felt mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="chip-hud flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/50 px-4 py-3">
          <div>
            <Link
              to="/r/$inviteCode"
              params={{ inviteCode }}
              className="text-xs font-semibold uppercase tracking-[0.2em] text-primary hover:underline"
            >
              {room.invite_code}
            </Link>
            <h1 className="text-xl font-bold">{room.name}</h1>
          </div>
          <div className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold tabular-nums text-primary">
            {fmtKyat(chips)} chips
          </div>
        </header>

        {room.is_admin ? (
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <CreateRoundForm roomId={room.id} />
            <section className="rounded-2xl border border-white/10 bg-black/35 p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Tabs</h2>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={collectM.isPending || pendingTabs.length === 0}
                  onClick={() => {
                    collectM.mutate(undefined, {
                      onSuccess: (res) =>
                        toast.success(`Collected ${res.collected}. Overdue ${res.overdue}.`),
                      onError: (err: Error) => toast.error(err.message),
                    });
                  }}
                >
                  {collectM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Collect unpaid
                </Button>
              </div>
              {tabsQ.isLoading ? (
                <Loader2 className="mt-4 h-4 w-4 animate-spin text-muted-foreground" />
              ) : pendingTabs.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No open tabs.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {pendingTabs.map((tab) => (
                    <li
                      key={tab.id}
                      className="flex justify-between rounded-lg bg-black/30 px-3 py-2"
                    >
                      <span className="uppercase tracking-wide text-muted-foreground">
                        {tab.kind} · {tab.status}
                      </span>
                      <span className="font-semibold tabular-nums">{fmtKyat(tab.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Rounds
          </h2>
          {marketsQ.isLoading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-muted-foreground">
              No rounds yet.
              {room.is_admin ? " Deal one from the host panel." : " Wait for the host."}
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {groups.map((group) => (
                <RoundCard key={group.id} group={group} roomId={room.id} isHost={room.is_admin} isFree={room.join_payment_mode === "free"} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
