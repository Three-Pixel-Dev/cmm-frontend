import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, QrCode, Settings, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";
import { CreateRoundForm } from "@/components/game/CreateRoundForm";
import { RoundCard } from "@/components/game/RoundCard";
import { RoomChat } from "@/components/game/RoomChat";
import { useHydrated } from "@/hooks/useHydrated";
import {
  useCollectRoomTabs,
  useRoom,
  useRoomMarkets,
  useRoomMembers,
  useRoomPreview,
  useRoomTabs,
} from "@/hooks/useRooms";
import { useAuth } from "@/store/useAuth";
import { fmtKyat } from "@/lib/format";
import { PaymentQrDialog, type PaymentQrData } from "@/components/game/PaymentQrDialog";
import { UploadPaymentQrModal } from "@/components/game/UploadPaymentQrModal";

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
  const isHost = useAuth((s) => s.isHost());
  const previewQ = useRoomPreview(inviteCode);
  const roomQ = useRoom(previewQ.data?.id, hydrated && isLoggedIn && !!previewQ.data?.id);
  const room = roomQ.data;
  const membersQ = useRoomMembers(room?.id, !!room?.is_member);
  const marketsQ = useRoomMarkets(room?.id, !!room?.is_member);
  const tabsQ = useRoomTabs(room?.id, !!room?.is_admin);
  const collectM = useCollectRoomTabs(room?.id);

  const [selectedQr, setSelectedQr] = useState<PaymentQrData | null>(null);
  const [myQrModalOpen, setMyQrModalOpen] = useState(false);
  const [hostQrModalOpen, setHostQrModalOpen] = useState(false);

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
        <h1 className="text-2xl font-bold">
          {isHost ? "This is not your table" : "Join the table first"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isHost ? "Host accounts only sit at tables they opened." : "This felt is members only."}
        </p>
        <Button asChild className="mt-6">
          {isHost ? (
            <Link to="/">Back to rooms</Link>
          ) : (
            <Link to="/r/$inviteCode" params={{ inviteCode }}>
              Back to lobby
            </Link>
          )}
        </Button>
      </main>
    );
  }

  const groups = marketsQ.data?.items ?? [];
  const pendingTabs = (tabsQ.data ?? []).filter(
    (t) => t.status === "pending" || t.status === "overdue",
  );
  const members = membersQ.data ?? [];
  const myMember = members.find((m) => m.user_id === user?.id);
  const chips = myMember?.chip_balance ?? 0;
  const hostQr = room.host_payment_qr_url || previewQ.data?.host_payment_qr_url;

  return (
    <main className="game-shell">
      <div className="game-felt mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        {/* Header HUD */}
        <header className="chip-hud hud-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <div>
            <Link
              to="/r/$inviteCode"
              params={{ inviteCode }}
              className="text-xs font-semibold uppercase tracking-[0.2em] text-primary hover:underline"
            >
              {room.invite_code}
            </Link>
            <h1 className="text-xl font-bold tracking-wide">{room.name}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hostQr ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setSelectedQr({
                    title: "Host Payment QR",
                    userName: "Room Host",
                    paymentType: room.host_payment_type || "MMQR",
                    accountName: room.host_payment_account_name,
                    accountNumber: room.host_payment_account_number,
                    qrUrl: hostQr,
                    note: "Scan to pay table entry fees or settlements directly to Host",
                  })
                }
                className="h-8 gap-1.5 border-primary/30 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/20"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>Host QR</span>
              </Button>
            ) : null}

            {!room.is_admin ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMyQrModalOpen(true)}
                className="h-8 gap-1.5 border-white/15 bg-black/40 text-xs font-medium text-foreground hover:bg-white/10"
              >
                <QrCode className="h-3.5 w-3.5 text-primary" />
                <span>My Payout QR</span>
                {myMember?.payment_qr_url ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                ) : null}
              </Button>
            ) : null}

            <div className="rounded-full border border-primary/35 bg-primary/10 px-4 py-1.5 font-display text-sm font-bold tabular-nums text-primary">
              {fmtKyat(chips)} table chips
            </div>
          </div>
        </header>

        {/* Host Control Panel */}
        {room.is_admin ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <CreateRoundForm roomId={room.id} />

            <div className="flex flex-col gap-4">
              {/* Host Settings & Tabs Card */}
              <section className="hud-panel rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">Table Tabs</h2>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setHostQrModalOpen(true)}
                      className="h-7 gap-1 text-xs border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      <Settings className="h-3 w-3" /> Host QR
                    </Button>
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
                      className="h-7 text-xs"
                    >
                      {collectM.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Collect unpaid
                    </Button>
                  </div>
                </div>

                {tabsQ.isLoading ? (
                  <Loader2 className="mt-4 h-4 w-4 animate-spin text-muted-foreground" />
                ) : pendingTabs.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">No open tabs.</p>
                ) : (
                  <ul className="mt-3 space-y-1.5 text-xs">
                    {pendingTabs.map((tab) => (
                      <li
                        key={tab.id}
                        className="flex justify-between rounded-lg bg-elevated/70 px-3 py-1.5"
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

              {/* Seated Players & Payout QRs Card */}
              <section className="hud-panel rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                    <Users className="h-4 w-4 text-primary" />
                    Seated Players & Payout QRs ({members.length})
                  </h2>
                </div>

                {members.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">No seated players.</p>
                ) : (
                  <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 text-xs">
                    {members.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-primary/10 bg-elevated/60 px-3 py-2"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <PlayerAvatar
                            src={m.user_avatar}
                            name={m.user_name || "Player"}
                            className="h-6 w-6"
                            fallbackClassName="text-[10px] font-bold"
                          />
                          <span className="truncate font-semibold text-foreground">
                            {m.user_name || m.user_id.slice(0, 8)}
                          </span>
                          <span className="font-display text-[10px] font-bold tabular-nums text-primary">
                            {fmtKyat(m.chip_balance ?? 0)}
                          </span>
                          {m.role === "admin" ? (
                            <Badge
                              variant="outline"
                              className="border-amber-400/40 bg-amber-400/10 text-[9px] text-amber-400 py-0 px-1"
                            >
                              Host
                            </Badge>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {m.role === "admin" ? null : m.payment_qr_url ||
                            m.payment_account_number ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setSelectedQr({
                                  userName: m.user_name || `Player ${m.user_id.slice(0, 8)}`,
                                  paymentType: m.payment_type || "MMQR",
                                  accountName: m.payment_account_name,
                                  accountNumber: m.payment_account_number,
                                  qrUrl: m.payment_qr_url,
                                  note: m.payment_note,
                                })
                              }
                              className="h-6 gap-1 border-primary/30 bg-primary/15 px-2 text-[10px] font-bold text-primary hover:bg-primary/25"
                            >
                              <QrCode className="h-3 w-3" />
                              <span>View QR</span>
                            </Button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/60 italic">
                              No QR
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        ) : null}

        {/* Rounds */}
        <section className="space-y-4 pb-20">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Rounds
            </h2>
            <span className="text-xs text-muted-foreground">
              {groups.length} {groups.length === 1 ? "round" : "rounds"}
            </span>
          </div>

          {marketsQ.isLoading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <p className="hud-panel rounded-2xl border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              No rounds yet.
              {room.is_admin ? " Deal one from the host panel." : " Wait for the host."}
            </p>
          ) : (
            <div className="grid gap-4">
              {groups.map((group) => (
                <RoundCard
                  key={group.id}
                  group={group}
                  roomId={room.id}
                  isHost={room.is_admin}
                  members={members}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <RoomChat roomId={room.id} isMember={room.is_member} />

      {/* QR Viewer Dialog */}
      <PaymentQrDialog
        open={!!selectedQr}
        onOpenChange={(op) => !op && setSelectedQr(null)}
        data={selectedQr}
      />

      {/* Player's Upload QR Modal */}
      {!room.is_admin ? (
        <UploadPaymentQrModal
          open={myQrModalOpen}
          onOpenChange={setMyQrModalOpen}
          roomId={room.id}
          isHost={false}
          initialValues={{
            payment_type: myMember?.payment_type,
            payment_account_name: myMember?.payment_account_name,
            payment_account_number: myMember?.payment_account_number,
            payment_qr_url: myMember?.payment_qr_url,
            payment_note: myMember?.payment_note,
          }}
        />
      ) : null}

      {/* Host's Payment QR Modal */}
      {room.is_admin ? (
        <UploadPaymentQrModal
          open={hostQrModalOpen}
          onOpenChange={setHostQrModalOpen}
          roomId={room.id}
          isHost={true}
          initialValues={{
            payment_type: room.host_payment_type,
            payment_account_name: room.host_payment_account_name,
            payment_account_number: room.host_payment_account_number,
            payment_qr_url: room.host_payment_qr_url,
          }}
        />
      ) : null}
    </main>
  );
}
