import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateRoom } from "@/hooks/useRooms";
import { roomsApi, type JoinPaymentMode } from "@/lib/api/rooms";

export function CreateRoomForm() {
  const navigate = useNavigate();
  const create = useCreateRoom();
  const mineQ = useQuery({
    queryKey: ["rooms", "mine"],
    queryFn: () => roomsApi.listMine(),
  });
  const existingRoom = mineQ.data && mineQ.data.length > 0 ? mineQ.data[0] : null;

  const limitQ = useQuery({
    queryKey: ["rooms", "my-limit"],
    queryFn: () => roomsApi.getMyLimit(),
  });
  const maxPlayersLimit = limitQ.data?.max_participants ?? 50;

  const [name, setName] = useState("");
  const [mode, setMode] = useState<JoinPaymentMode>("after");
  const [fee, setFee] = useState("1000");

  // Single Question configuration
  const [questionTitle, setQuestionTitle] = useState("");
  const [price, setPrice] = useState("100");
  const [hours, setHours] = useState("24");
  const [stakeMode, setStakeMode] = useState<"prepaid" | "pay_after">("prepaid");
  const [optionType, setOptionType] = useState<"yes_no" | "three_way" | "custom">("yes_no");
  const [customOptions, setCustomOptions] = useState<string[]>(["Option 1", "Option 2"]);
  const [isFairMode, setIsFairMode] = useState(true);

  const handleAddOption = () => {
    if (customOptions.length >= 10) {
      toast.error("Maximum 10 options allowed.");
      return;
    }
    setCustomOptions((prev) => [...prev, `Option ${prev.length + 1}`]);
  };

  const handleRemoveOption = (index: number) => {
    if (customOptions.length <= 2) {
      toast.error("At least 2 options are required.");
      return;
    }
    setCustomOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, val: string) => {
    setCustomOptions((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  if (existingRoom) {
    return (
      <div className="hud-panel space-y-4 rounded-2xl p-5 text-center sm:p-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">Table Already Open</h3>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Each host access code allows creating <strong>1 table</strong>. You already have an active table:
          </p>
          <div className="mt-3 rounded-xl border border-primary/30 bg-primary/10 p-3">
            <span className="block font-bold text-sm text-foreground">{existingRoom.name}</span>
            <span className="block font-mono text-xs text-primary font-semibold mt-0.5">Code: {existingRoom.invite_code}</span>
          </div>
        </div>
        <Button
          onClick={() => void navigate({ to: "/r/$inviteCode/table", params: { inviteCode: existingRoom.invite_code } })}
          className="w-full font-semibold"
        >
          Go to My Table →
        </Button>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const joinFee = mode === "free" ? 0 : Number.parseInt(fee, 10);
    const oneSharePrice = Number.parseInt(price, 10);
    const closeHours = Number.parseInt(hours, 10);

    if (!name.trim()) {
      toast.error("Name the table first.");
      return;
    }
    if (mode !== "free" && (!Number.isFinite(joinFee) || joinFee <= 0)) {
      toast.error("Enter a join fee.");
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

    let finalOptions: string[] = [];
    if (optionType === "yes_no") {
      finalOptions = ["Yes", "No"];
    } else if (optionType === "three_way") {
      finalOptions = ["Team 1", "Draw", "Team 2"];
    } else {
      finalOptions = customOptions.map((o) => o.trim()).filter(Boolean);
      if (finalOptions.length < 2) {
        toast.error("Please enter at least 2 non-empty options.");
        return;
      }
    }

    create.mutate(
      {
        name: name.trim(),
        join_payment_mode: mode,
        join_fee: joinFee,
        max_participants: maxPlayersLimit,
        question_title: questionTitle.trim(),
        one_share_price: oneSharePrice,
        close_hours: Number.isFinite(closeHours) && closeHours > 0 ? closeHours : 24,
        stake_mode: stakeMode,
        options: finalOptions,
        is_fair_mode: isFairMode,
      },
      {
        onSuccess: (room) => {
          toast.success("Table & Question are open!");
          void navigate({ to: "/r/$inviteCode/table", params: { inviteCode: room.invite_code } });
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

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-primary">Max Players (Table Capacity)</Label>
            <span className="text-xs font-bold text-primary">
              {limitQ.isLoading ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading limit…
                </span>
              ) : (
                `${maxPlayersLimit} Players Limit`
              )}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {limitQ.isLoading ? (
              "Fetching your table player limit set by Super Admin..."
            ) : (
              <>
                Your table player limit is set to <strong className="text-foreground">{maxPlayersLimit} players</strong> by Super Admin via your host access code.
              </>
            )}
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

        {/* Betting Rules Mode */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Betting Rules Mode</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsFairMode(true)}
              className={`rounded-xl border p-3 text-left transition-all ${
                isFairMode
                  ? "border-primary bg-primary/10 text-foreground shadow-sm"
                  : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <span>🛡️</span> Fair Play Mode
              </div>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                Overcrowded protection <strong>ON</strong> • <strong>1 bet</strong> per player limit
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsFairMode(false)}
              className={`rounded-xl border p-3 text-left transition-all ${
                !isFairMode
                  ? "border-primary bg-primary/10 text-foreground shadow-sm"
                  : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <span>⚡</span> Open Trading Mode
              </div>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                Overcrowded protection <strong>OFF</strong> • <strong>Multiple bets</strong> allowed
              </p>
            </button>
          </div>
        </div>

        {/* Outcome Options */}
        <div className="space-y-2">
          <Label>Outcome Options</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "yes_no", label: "Yes / No" },
              { id: "three_way", label: "3-Way Sports" },
              { id: "custom", label: "Custom Multi" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setOptionType(t.id as any)}
                className={
                  optionType === t.id
                    ? "hud-choice hud-choice-active rounded-xl px-2 py-2 text-xs font-bold"
                    : "hud-choice rounded-xl px-2 py-2 text-xs text-muted-foreground"
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {optionType === "custom" ? (
            <div className="space-y-2 rounded-xl border border-primary/20 bg-elevated/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Choices ({customOptions.length}/10)
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs"
                  onClick={handleAddOption}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Option
                </Button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {customOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 font-mono text-xs text-muted-foreground">
                      #{idx + 1}
                    </span>
                    <Input
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="h-8 text-xs"
                      maxLength={64}
                    />
                    {customOptions.length > 2 ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveOption(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Button type="submit" className="w-full font-semibold" disabled={create.isPending}>
        {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Open Table & Question
      </Button>
    </form>
  );
}
