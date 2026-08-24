import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeInviteCode } from "@/lib/rooms/copy";

export function RoomCodeForm({
  size = "lg",
  autoFocus = false,
}: {
  size?: "lg" | "sm";
  autoFocus?: boolean;
}) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const invite = normalizeInviteCode(code);
    if (!invite) return;
    void navigate({ to: "/r/$inviteCode", params: { inviteCode: invite } });
  };

  return (
    <form onSubmit={submit} className="flex w-full gap-2">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="ROOM CODE"
        autoFocus={autoFocus}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        className={
          size === "lg"
            ? "h-14 flex-1 border-primary/35 bg-elevated/80 font-display font-semibold text-lg tracking-[0.28em] uppercase"
            : "h-9 flex-1 border-primary/25 bg-elevated/80 font-display font-semibold text-xs tracking-[0.2em] uppercase"
        }
        aria-label="Room invite code"
      />
      <Button type="submit" size={size === "lg" ? "lg" : "sm"} className="shrink-0 font-semibold">
        Enter
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
