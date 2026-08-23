import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Copy, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/useHydrated";
import { useJoinRoom, useRoom, useRoomMembers, useRoomPreview } from "@/hooks/useRooms";
import { useAuth } from "@/store/useAuth";
import { joinFeeCopy, joinModeLabel } from "@/lib/rooms/copy";
import { getShareOrigin } from "@/lib/app-url";

export const Route = createFileRoute("/r/$inviteCode")({
  head: ({ params }) => ({
    meta: [{ title: `Room ${params.inviteCode} — SuperCash` }],
  }),
  component: RoomLobbyPage,
});

function RoomLobbyPage() {
  const { inviteCode } = Route.useParams();
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const previewQ = useRoomPreview(inviteCode);
  const roomQ = useRoom(previewQ.data?.id, hydrated && isLoggedIn && !!previewQ.data?.id);
  const membersQ = useRoomMembers(roomQ.data?.id, !!roomQ.data?.is_member);
  const joinM = useJoinRoom();
  const [copied, setCopied] = useState(false);

  const preview = previewQ.data;
  const room = roomQ.data;
  const isMember = !!room?.is_member;
  const shareUrl = `${getShareOrigin()}/r/${inviteCode}`;

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Invite link copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const join = () => {
    if (!isLoggedIn) {
      void navigate({ to: "/login", search: { redirect: `/r/${inviteCode}` } });
      return;
    }
    joinM.mutate(inviteCode, {
      onSuccess: () => toast.success("You're in."),
      onError: (err: Error) => toast.error(err.message),
    });
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

  return (
    <main className="game-shell">
      <div className="game-felt mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
        <section className="rounded-3xl border border-white/10 bg-black/40 p-6 text-center shadow-[0_0_80px_rgba(0,0,0,0.35)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            Table lobby
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{preview.name}</h1>
          <p className="invite-code-display mt-6 font-mono text-4xl tracking-[0.35em] text-primary sm:text-5xl">
            {preview.invite_code}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            {joinModeLabel(preview.join_payment_mode)} ·{" "}
            {joinFeeCopy(preview.join_payment_mode, preview.join_fee)}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button type="button" variant="outline" onClick={() => void copyShare()}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copy invite
            </Button>
            {isMember ? (
              <Button asChild>
                <Link to="/r/$inviteCode/table" params={{ inviteCode }}>
                  Sit at the table
                </Link>
              </Button>
            ) : (
              <Button onClick={join} disabled={joinM.isPending}>
                {joinM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {preview.join_payment_mode === "required"
                  ? "Pay and join"
                  : preview.join_payment_mode === "after"
                    ? "Join on tab"
                    : "Join free"}
              </Button>
            )}
          </div>
          {!isLoggedIn ? (
            <p className="mt-4 text-xs text-muted-foreground">You need a player account to join.</p>
          ) : null}
        </section>

        {isMember ? (
          <section className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-primary" />
              Seated ({membersQ.data?.length ?? room?.member_count ?? 0})
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {(membersQ.data ?? []).map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 px-3 py-2 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="truncate font-mono text-xs">{m.user_id.slice(0, 8)}</span>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {m.role} · {m.join_payment_status}
                    </span>
                  </div>
                  {room?.is_admin ? <AddChipsDialog roomId={room.id} userId={m.user_id} /> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddVirtualChips } from "@/hooks/useRooms";
import { Coins } from "lucide-react";

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
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-primary hover:text-primary">
          <Coins className="h-4 w-4" />
          <span className="sr-only">Add Chips</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xs">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add Play Chips</DialogTitle>
            <DialogDescription>Grant virtual chips to this player.</DialogDescription>
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
