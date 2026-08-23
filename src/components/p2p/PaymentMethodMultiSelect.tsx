import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type PaymentMethodOption = {
  id: string;
  name: string;
  photo_url?: string;
};

type PaymentMethodMultiSelectProps = {
  id?: string;
  options: PaymentMethodOption[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  emptyLabel: string;
  className?: string;
};

export function PaymentMethodMultiSelect({
  id,
  options,
  value,
  onChange,
  disabled,
  emptyLabel,
  className,
}: PaymentMethodMultiSelectProps) {
  const selected = new Set(value);

  const toggle = (optionId: string, checked: boolean) => {
    if (checked) {
      onChange([...value, optionId]);
      return;
    }
    onChange(value.filter((v) => v !== optionId));
  };

  if (options.length === 0) {
    return (
      <p
        id={id}
        className={cn(
          "rounded-md border border-dashed border-border/60 px-3 py-2 text-sm text-muted-foreground",
          className,
        )}
      >
        {emptyLabel}
      </p>
    );
  }

  return (
    <div
      id={id}
      className={cn(
        "max-h-48 space-y-2 overflow-y-auto rounded-md border border-border/60 bg-background p-3",
        className,
      )}
    >
      {options.map((opt) => {
        const checked = selected.has(opt.id);
        const inputId = id ? `${id}-${opt.id}` : opt.id;
        return (
          <div key={opt.id} className="flex items-center gap-2">
            <Checkbox
              id={inputId}
              checked={checked}
              disabled={disabled}
              onCheckedChange={(next) => toggle(opt.id, next === true)}
            />
            <Label
              htmlFor={inputId}
              className="flex flex-1 cursor-pointer items-center gap-2 font-normal"
            >
              {opt.photo_url ? (
                <img src={opt.photo_url} alt="" className="h-5 w-5 rounded object-cover" />
              ) : null}
              {opt.name}
            </Label>
          </div>
        );
      })}
    </div>
  );
}
