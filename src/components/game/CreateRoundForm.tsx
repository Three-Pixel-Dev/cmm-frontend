import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateRoomMarket } from "@/hooks/useRooms";
import type { StakeMode } from "@/lib/api/rooms";

export function CreateRoundForm({ roomId }: { roomId: string }) {
  const create = useCreateRoomMarket(roomId);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("100");
  const [hours, setHours] = useState("24");
  const [stakeMode, setStakeMode] = useState<StakeMode>("prepaid");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const oneSharePrice = Number.parseInt(price, 10);
    const closeHours = Number.parseInt(hours, 10);
    if (!title.trim()) {
      toast.error("Name this round.");
      return;
    }
    if (!Number.isFinite(oneSharePrice) || oneSharePrice <= 0) {
      toast.error("Share price must be greater than zero.");
      return;
    }
    create.mutate(
      {
        title: title.trim(),
        one_share_price: oneSharePrice,
        close_hours: Number.isFinite(closeHours) && closeHours > 0 ? closeHours : 24,
        stake_mode: stakeMode,
        options: ["Yes", "No"],
      },
      {
        onSuccess: () => {
          toast.success("Round is live.");
          setTitle("");
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border border-primary/25 bg-black/40 p-4"
    >
      <p className="text-sm font-semibold tracking-wide text-primary">Deal a round</p>
      <div className="space-y-1.5">
        <Label htmlFor="round-title">Question</Label>
        <Input
          id="round-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Will the next roll be even?"
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
                ? "rounded-xl border border-primary bg-primary/15 px-3 py-2 text-sm font-semibold text-primary"
                : "rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-muted-foreground"
            }
          >
            {label}
          </button>
        ))}
      </div>
      <Button type="submit" className="w-full" disabled={create.isPending}>
        {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Open round
      </Button>
    </form>
  );
}
