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
  const [mode, setMode] = useState<JoinPaymentMode>("required");
  const [fee, setFee] = useState("1000");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const joinFee = mode === "free" ? 0 : Number.parseInt(fee, 10);
    if (!name.trim()) {
      toast.error("Name the table first.");
      return;
    }
    if (mode !== "free" && (!Number.isFinite(joinFee) || joinFee <= 0)) {
      toast.error("Enter a join fee.");
      return;
    }
    create.mutate(
      {
        name: name.trim(),
        join_payment_mode: mode,
        join_fee: joinFee,
      },
      {
        onSuccess: (room) => {
          toast.success("Table is open.");
          void navigate({ to: "/r/$inviteCode", params: { inviteCode: room.invite_code } });
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="room-name">Table name</Label>
        <Input
          id="room-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Friday night table"
          maxLength={128}
        />
      </div>
      <div className="grid gap-2">
        <Label>Buy-in</Label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["required", "Pay now"],
              ["after", "Pay later"],
              ["free", "Free"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={
                mode === value
                  ? "rounded-xl border border-primary bg-primary/15 px-3 py-2 text-sm font-semibold text-primary"
                  : "rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-muted-foreground hover:border-white/25"
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
        </div>
      ) : null}
      <Button type="submit" className="w-full font-semibold" disabled={create.isPending}>
        {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Open a table
      </Button>
    </form>
  );
}
