import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveAvatarSrc } from "@/lib/avatars";
import { cn } from "@/lib/utils";

function initialsOf(name?: string | null) {
  const trimmed = (name || "?").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

export function PlayerAvatar({
  src,
  name,
  className,
  fallbackClassName,
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  const resolved = resolveAvatarSrc(src);
  return (
    <Avatar className={cn("border border-white/10", className)}>
      {resolved ? <AvatarImage src={resolved} alt={name || "Player"} /> : null}
      <AvatarFallback
        className={cn("bg-primary/20 text-[11px] font-bold text-primary", fallbackClassName)}
      >
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
}
