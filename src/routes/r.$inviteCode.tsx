import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Coins, Copy, Loader2, QrCode, UploadCloud, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";
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
import { useHydrated } from "@/hooks/useHydrated";
import {
  useAddVirtualChips,
  useJoinRoom,
  useRoom,
  useRoomMembers,
  useRoomPreview,
} from "@/hooks/useRooms";
import { useAuth } from "@/store/useAuth";
import { isPaidJoin, joinFeeCopy, joinModeLabel } from "@/lib/rooms/copy";
import { fmtKyat } from "@/lib/format";
import { getShareOrigin } from "@/lib/app-url";
import { uploadFile } from "@/lib/api/files";
import type { RoomMember } from "@/lib/api/rooms";
import { PaymentQrDialog, type PaymentQrData } from "@/components/game/PaymentQrDialog";

export const Route = createFileRoute("/r/$inviteCode")({
  head: ({ params }) => ({
    meta: [{ title: `Room ${params.inviteCode} — SuperCash` }],
  }),
  component: RoomLobbyPage,
});

const PAYMENT_PROVIDERS = [
  { id: "MMQR", label: "MMQR (All Banks)" },
  { id: "KBZPay", label: "KBZPay (KPay)" },
  { id: "WavePay", label: "WavePay" },
  { id: "CBPay", label: "CBPay" },
  { id: "AYAPay", label: "AYA Pay" },
  { id: "Other", label: "Other" },
];

function RoomLobbyPage() {
  const { inviteCode } = Route.useParams();
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const isHost = useAuth((s) => s.isHost());
  const previewQ = useRoomPreview(inviteCode);
  const roomQ = useRoom(previewQ.data?.id, hydrated && isLoggedIn && !!previewQ.data?.id);
  const membersQ = useRoomMembers(roomQ.data?.id, !!roomQ.data?.is_member);
  const [copied, setCopied] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [selectedQr, setSelectedQr] = useState<PaymentQrData | null>(null);

  const preview = previewQ.data;
  const room = roomQ.data;
  const isMember = !!room?.is_member;
  const shareUrl = `${getShareOrigin()}/r/${inviteCode}`;

  const memberCount = preview?.member_count ?? members.length;
  const maxSeats = preview?.max_participants || 50;
  const availableSlots = preview?.available_slots ?? Math.max(0, maxSeats - memberCount);
  const isFull = preview?.is_full ?? (memberCount >= maxSeats);

  const copyShare = async () => {
    try {
      const shareText = `Join table "${preview?.name}" on SuperCash!\nInvite Code: ${inviteCode}\nSeats Left: ${availableSlots}\nLink: ${shareUrl}`;
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success("Invite code & link copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const onJoinClick = () => {
    if (isHost) {
      toast.error("Host accounts run tables and cannot join as a player.");
      return;
    }
    if (isFull) {
      toast.error("This table has reached its maximum participant limit.");
      return;
    }
    if (!isLoggedIn) {
      void navigate({ to: "/login", search: { redirect: `/r/${inviteCode}` } });
      return;
    }
    setJoinDialogOpen(true);
  };

  if (previewQ.isLoading) {
    return (
      <main className="game-shell flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (previewQ.isError || !preview) {
    return (
      <main className="game-shell mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Room not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          That invite code is unknown or inactive.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Back to lobby</Link>
        </Button>
      </main>
    );
  }

  const hostQr = preview.host_payment_qr_url || room?.host_payment_qr_url;

  return (
    <main className="game-shell">
      <div className="game-felt mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
        <section className="hud-panel rounded-3xl p-6 text-center sm:p-10">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            Table lobby
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-wide sm:text-5xl">{preview.name}</h1>
          <p className="invite-code-display mt-6 font-mono text-4xl tracking-[0.35em] text-primary sm:text-5xl">
            {preview.invite_code}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="rounded-full border border-white/10 bg-elevated/80 px-3 py-1 text-muted-foreground">
              {joinModeLabel(preview.join_payment_mode)} ·{" "}
              {joinFeeCopy(preview.join_payment_mode, preview.join_fee)}
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-semibold text-primary">
              <Users className="h-3.5 w-3.5" />
              <span>
                {memberCount} / {maxSeats} Players ({availableSlots} seats left)
              </span>
            </span>
            {isFull && !isMember ? (
              <Badge variant="secondary" className="border-red-500/30 bg-red-500/15 text-red-400">
                Table Full
              </Badge>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button type="button" variant="outline" onClick={() => void copyShare()}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copy invite
            </Button>

            {hostQr ? (
              <Button
                type="button"
                variant="outline"
                className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                onClick={() =>
                  setSelectedQr({
                    title: "Host Payment QR",
                    userName: "Room Host",
                    paymentType: preview.host_payment_type || "MMQR",
                    accountName: preview.host_payment_account_name,
                    accountNumber: preview.host_payment_account_number,
                    qrUrl: hostQr,
                    note: "Scan to pay table entry fees or settlements directly to Host",
                  })
                }
              >
                <QrCode className="mr-1.5 h-4 w-4" /> Host QR
              </Button>
            ) : null}

            {isMember ? (
              <Button asChild>
                <Link to="/r/$inviteCode/table" params={{ inviteCode }}>
                  Sit at the table
                </Link>
              </Button>
            ) : isHost ? null : (preview.member_count ?? members.length) >= (preview.max_participants || 50) ? (
              <Button disabled className="opacity-50">
                Table Full ({preview.member_count ?? members.length}/{preview.max_participants || 50})
              </Button>
            ) : (
              <Button onClick={onJoinClick}>
                {isPaidJoin(preview.join_payment_mode) ? "Join on tab" : "Join table"}
              </Button>
            )}
          </div>

          {!isLoggedIn ? (
            <p className="mt-4 text-xs text-muted-foreground">You need a player account to join.</p>
          ) : isHost && !isMember ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Host accounts run their own tables. Open one from{" "}
              <Link to="/" className="text-primary hover:underline">
                Rooms
              </Link>
              .
            </p>
          ) : null}
        </section>

        {isMember ? (
          <section className="hud-panel rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4 text-primary" />
                Seated Players ({membersQ.data?.length ?? room?.member_count ?? 0})
              </h2>
            </div>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {(membersQ.data ?? []).map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-primary/10 bg-elevated/60 p-3 text-sm transition-colors hover:border-primary/30"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <PlayerAvatar
                      src={m.user_avatar}
                      name={m.user_name || "Player"}
                      className="h-8 w-8"
                    />
                    <div className="flex flex-col truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate font-semibold text-xs text-foreground">
                          {m.user_name || m.user_id.slice(0, 8)}
                        </span>
                        {m.role === "admin" ? (
                          <Badge
                            variant="outline"
                            className="border-amber-400/40 bg-amber-400/10 text-[10px] text-amber-400 py-0 px-1"
                          >
                            Host
                          </Badge>
                        ) : null}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {fmtKyat(m.chip_balance ?? 0)} chips · {m.join_payment_status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {m.role === "admin" ? null : m.payment_qr_url || m.payment_account_number ? (
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
                        className="h-7 gap-1 border-primary/30 bg-primary/10 px-2 text-[11px] font-medium text-primary hover:bg-primary/20"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>QR</span>
                      </Button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60 italic">No QR</span>
                    )}

                    {room?.is_admin && m.role !== "admin" ? (
                      <AddChipsDialog roomId={room.id} userId={m.user_id} />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {/* Join Dialog with optional QR info */}
      <JoinTableDialog
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
        inviteCode={inviteCode}
        preview={preview}
      />

      {/* QR Viewer Dialog */}
      <PaymentQrDialog
        open={!!selectedQr}
        onOpenChange={(op) => !op && setSelectedQr(null)}
        data={selectedQr}
      />
    </main>
  );
}

function JoinTableDialog({
  open,
  onOpenChange,
  inviteCode,
  preview,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inviteCode: string;
  preview: import("@/lib/api/rooms").RoomPreview;
}) {
  const [paymentType, setPaymentType] = useState("MMQR");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const joinM = useJoinRoom();

  const handleUpload = async (file: File | undefined | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadFile(file);
      setQrUrl(res.url);
      toast.success("QR code image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleJoin = () => {
    joinM.mutate(
      {
        invite_code: inviteCode,
        payment_type: paymentType,
        payment_account_name: accountName.trim() || undefined,
        payment_account_number: accountNumber.trim() || undefined,
        payment_qr_url: qrUrl || undefined,
        payment_note: paymentNote.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("You're in the room!");
          onOpenChange(false);
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="hud-panel p-6 text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Join Table: {preview.name}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isPaidJoin(preview.join_payment_mode)
              ? `Table fee: ${preview.join_fee.toLocaleString()} Ks — pay the host via QR`
              : "Free entry table"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <QrCode className="h-4 w-4" />
              <span>Decentralized Payout QR (Optional)</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Provide your MMQR, KBZPay, or WavePay QR image so the room host can easily send your
              payouts and winnings. You can also leave this blank and add it later.
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Payment Provider</Label>
            <Select value={paymentType} onValueChange={setPaymentType}>
              <SelectTrigger className="border-white/10 bg-black/40 text-xs">
                <SelectValue placeholder="Select Provider" />
              </SelectTrigger>
              <SelectContent className="border-white/15 bg-neutral-950 text-foreground text-xs">
                {PAYMENT_PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* QR Image Upload */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">QR Code Image</Label>
            {qrUrl ? (
              <div className="flex items-center justify-between rounded-lg border border-white/15 bg-black/50 p-2">
                <img
                  src={qrUrl}
                  alt="QR Preview"
                  className="h-12 w-12 rounded object-contain bg-white p-0.5"
                />
                <span className="text-xs text-emerald-400 font-medium">QR Uploaded</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setQrUrl("")}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-black/30 p-3 text-xs text-muted-foreground hover:border-white/40 hover:bg-black/40 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleUpload(e.target.files?.[0])}
                />
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Uploading QR...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4 text-primary" />
                    <span>Upload MMQR / KPay QR image</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Account Name</Label>
              <Input
                placeholder="e.g. U Kyaw"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="border-white/10 bg-black/40 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Phone / Number</Label>
              <Input
                placeholder="e.g. 09123456789"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="border-white/10 bg-black/40 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Note / Remarks</Label>
            <Input
              placeholder="e.g. KPay only"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              className="border-white/10 bg-black/40 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="mt-2 flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleJoin}
            disabled={joinM.isPending || uploading}
            className="gap-1.5"
          >
            {joinM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Join Room
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useRef } from "react";

function AddChipsDialog({ roomId, userId }: { roomId: string; userId: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("10000");
  const addChips = useAddVirtualChips(roomId);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(amount, 10);
    if (isNaN(val) || val <= 0) {
      toast.error("Invalid amount");
      return;
    }
    addChips.mutate(
      { userId, amount: val },
      {
        onSuccess: () => {
          toast.success("Chips added");
          setOpen(false);
          setAmount("10000");
        },
        onError: (err) => {
          toast.error(err.message);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="h-7 w-7 p-0 text-primary hover:bg-primary/20 hover:text-primary"
      >
        <Coins className="h-3.5 w-3.5" />
        <span className="sr-only">Add Chips</span>
      </Button>
      <DialogContent className="hud-panel sm:max-w-xs text-foreground">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add Play Chips</DialogTitle>
            <DialogDescription>
              Grant chips for this table only. They stay here when the player leaves other rooms.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                className="border-white/10 bg-black/40"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={addChips.isPending}>
              {addChips.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add Chips
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
