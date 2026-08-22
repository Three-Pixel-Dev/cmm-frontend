import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

type OtpInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  invalid?: boolean;
  onComplete?: (code: string) => void;
};

export function OtpInput({
  id,
  value,
  onChange,
  disabled,
  autoFocus,
  invalid,
  onComplete,
}: OtpInputProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t("login.otpCode")}</Label>
      <div className="flex justify-center">
        <InputOTP
          id={id}
          maxLength={6}
          value={value}
          onChange={(next) => {
            onChange(next);
            if (next.length === 6) onComplete?.(next);
          }}
          disabled={disabled}
          autoFocus={autoFocus}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-invalid={invalid || undefined}
          containerClassName="gap-2"
        >
          <InputOTPGroup className="gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className={cn(
                  "h-12 w-11 rounded-lg border border-border bg-elevated text-lg font-semibold tabular-nums",
                  "first:rounded-lg last:rounded-lg first:border-l last:border-r",
                  invalid && "border-destructive aria-invalid:border-destructive",
                )}
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
    </div>
  );
}
