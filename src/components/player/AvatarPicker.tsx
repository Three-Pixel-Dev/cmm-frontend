import { DEFAULT_AVATARS, avatarPath } from "@/lib/avatars";
import { cn } from "@/lib/utils";

export function AvatarPicker({
  value,
  onChange,
  disabled,
}: {
  value?: string | null;
  onChange: (path: string) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="grid grid-cols-4 gap-2 sm:grid-cols-6"
      role="listbox"
      aria-label="Default profiles"
    >
      {DEFAULT_AVATARS.map((avatar) => {
        const path = avatarPath(avatar.id);
        const selected = value === path;
        return (
          <button
            key={avatar.id}
            type="button"
            role="option"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onChange(path)}
            className={cn(
              "flex aspect-square items-center justify-center overflow-hidden rounded-full border-2 bg-elevated/80 p-0.5 transition-all",
              selected
                ? "border-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
                : "border-transparent hover:border-primary/40",
              disabled && "cursor-not-allowed opacity-60",
            )}
            title={avatar.label}
          >
            <img
              src={path}
              alt={avatar.label}
              className="h-full w-full rounded-full object-cover"
            />
          </button>
        );
      })}
    </div>
  );
}
