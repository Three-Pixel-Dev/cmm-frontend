import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateRoom } from "@/hooks/useRooms";
import type { JoinPaymentMode } from "@/lib/api/rooms";

export function CreateRoomForm() {
  const navigate = useNavigate();
  const create = useCreateRoom();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<JoinPaymentMode>("after");
  const [fee, setFee] = useState("1000");
  const [maxPlayers, setMaxPlayers] = useState("50");

  // Single Question configuration
  const [questionTitle, setQuestionTitle] = useState("");
  const [price, setPrice] = useState("100");
  const [hours, setHours] = useState("24");
  const [stakeMode, setStakeMode] = useState<"prepaid" | "pay_after">("prepaid");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const joinFee = mode === "free" ? 0 : Number.parseInt(fee, 10);
    const oneSharePrice = Number.parseInt(price, 10);
    const closeHours = Number.parseInt(hours, 10);
    const maxParticipants = Number.parseInt(maxPlayers, 10);

    if (!name.trim()) {
      toast.error("Name the table first.");
      return;
    }
    if (mode !== "free" && (!Number.isFinite(joinFee) || joinFee <= 0)) {
      toast.error("Enter a join fee.");
      return;
    }
    if (!Number.isFinite(maxParticipants) || maxParticipants < 2) {
      toast.error("Max players must be at least 2.");
      return;
    }
    if (!questionTitle.trim()) {
      toast.error("Enter the question for this table.");
      return;
    }
    if (!Number.isFinite(oneSharePrice) || oneSharePrice <= 0) {
      toast.error("Enter a valid chip price.");
      return;
    }

    create.mutate(
      {
        name: name.trim(),
        join_payment_mode: mode,
        join_fee: joinFee,
        max_participants: maxParticipants,
        question_title: questionTitle.trim(),
        one_share_price: oneSharePrice,
        close_hours: Number.isFinite(closeHours) && closeHours > 0 ? closeHours : 24,
        stake_mode: stakeMode,
        options: ["Yes", "No"],
      },
      {
        onSuccess: (room) => {
          toast.success("Table & Question are open!");
          void navigate({ to: "/r/$inviteCode_/table", params: { inviteCode: room.invite_code } });
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Table Section */}
      <div className="space-y-3">
        <p className="font-display text-sm font-semibold uppercase tracking-wider text-primary">
          Table Settings
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="room-name">Table name</Label>
          <Input
            id="room-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Friday night match"
            maxLength={128}
          />
        </div>

        <div className="grid gap-2">
          <Label>Buy-in</Label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["after", "Paid (QR/tab)"],
                ["free", "Free"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={
                  mode === value
                    ? "hud-choice hud-choice-active rounded-xl px-3 py-2 font-display text-sm font-semibold"
                    : "hud-choice rounded-xl px-3 py-2 font-display text-sm text-muted-foreground"
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {mode !== "free" ? (
          <div className="space-y-1.5">
            <Label htmlFor="join-fee">Join fee</Label>
            <Input
              id="join-fee"
              inputMode="numeric"
              value={fee}
              onChange={(e) => setFee(e.target.value.replace(/[^\d]/g, ""))}
            />
            <p className="text-xs text-muted-foreground">
              Player sits now. They pay you this amount via Host QR; Collect unpaid when cash is in.
            </p>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="max-players">Max Players (Limit)</Label>
            <span className="text-xs font-semibold text-primary">{maxPlayers || 0} players</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {["5", "10", "20", "50", "100"].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setMaxPlayers(count)}
                className={
                  maxPlayers === count
                    ? "hud-choice hud-choice-active rounded-lg px-2.5 py-1 text-xs font-bold"
                    : "hud-choice rounded-lg px-2.5 py-1 text-xs text-muted-foreground"
                }
              >
                {count}
              </button>
            ))}
            <Input
              id="max-players"
              inputMode="numeric"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value.replace(/[^\d]/g, ""))}
              className="h-8 w-20 text-xs font-mono"
              placeholder="Custom"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Once {maxPlayers || 50} players join, new players will be blocked from entering.
          </p>
        </div>
      </div>

      {/* Question Section */}
      <div className="space-y-3 border-t border-primary/20 pt-3">
        <p className="font-display text-sm font-semibold uppercase tracking-wider text-primary">
          Question (1 per Table)
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="question-title">Question</Label>
          <Input
            id="question-title"
            value={questionTitle}
            onChange={(e) => setQuestionTitle(e.target.value)}
            placeholder="Will Liverpool win against Arsenal?"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="share-price">Chip price</Label>
            <Input
              id="share-price"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="close-hours">Hours open</Label>
            <Input
              id="close-hours"
              inputMode="numeric"
              value={hours}
              onChange={(e) => setHours(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Bet Stake Mode</Label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["prepaid", "Prepaid"],
                ["pay_after", "Pay after"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStakeMode(value)}
                className={
                  stakeMode === value
                    ? "hud-choice hud-choice-active rounded-xl px-3 py-2 font-display text-sm font-semibold"
                    : "hud-choice rounded-xl px-3 py-2 font-display text-sm text-muted-foreground"
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full font-semibold" disabled={create.isPending}>
        {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Open Table & Question
      </Button>
    </form>
  );
}
