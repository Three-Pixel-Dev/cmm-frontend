import { Link } from "@tanstack/react-router";
import { Crown, Users } from "lucide-react";
import type { Room } from "@/lib/api/rooms";
import { joinFeeCopy, joinModeLabel } from "@/lib/rooms/copy";

export function RoomListCard({ room }: { room: Room }) {
  return (
    <Link
      to="/r/$inviteCode"
      params={{ inviteCode: room.invite_code }}
      className="game-room-tile group flex flex-col gap-3 rounded-2xl p-4 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold tracking-wide">{room.name}</p>
          <p className="invite-code-display mt-1 font-mono text-xs tracking-[0.22em] text-primary">
            {room.invite_code}
          </p>
        </div>
        {room.is_admin ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            <Crown className="h-3 w-3" />
            Host
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {joinModeLabel(room.join_payment_mode)} ·{" "}
          {joinFeeCopy(room.join_payment_mode, room.join_fee)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {room.member_count}
        </span>
      </div>
    </Link>
  );
}
