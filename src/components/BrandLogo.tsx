import { cn } from "@/lib/utils";

type BrandLogoProps = {
  variant?: "full" | "icon";
  className?: string;
  suffix?: string;
};

export function BrandLogo({ variant = "full", className, suffix }: BrandLogoProps) {
  if (variant === "icon") {
    return (
      <img
        src="/logo-icon.png"
        alt="SuperCash"
        className={cn("h-9 w-9 shrink-0 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <img
        src="/logo.png"
        alt="SuperCash — Predict more, Win more"
        className="h-9 w-auto max-w-[160px] object-contain object-left sm:max-w-[190px]"
      />
      {suffix ? (
        <span className="truncate text-xs font-semibold uppercase tracking-wide text-primary">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}
