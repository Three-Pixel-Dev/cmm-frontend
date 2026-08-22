import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface ComboboxOption {
  value: string;
  /** Visible label (also used for search matching). */
  label: string;
  /** Extra terms to match against while searching. */
  keywords?: string[];
  /** Leading node shown in the list and on the trigger (e.g. a flag). */
  leading?: React.ReactNode;
  /** Trailing node shown in the list (e.g. a dial code). */
  trailing?: React.ReactNode;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  contentClassName?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results.",
  disabled,
  id,
  className,
  contentClassName,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span
            className={cn("flex min-w-0 items-center gap-2", !selected && "text-muted-foreground")}
          >
            {selected?.leading}
            <span className="truncate">{selected ? selected.label : placeholder}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("w-(--radix-popover-trigger-width) p-0", contentClassName)}
      >
        <Command
          filter={(val, search, keywords) => {
            const haystack = `${val} ${(keywords ?? []).join(" ")}`.toLowerCase();
            return haystack.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {options.map((opt) => (
              <CommandItem
                key={opt.value}
                value={opt.value}
                keywords={[opt.label, ...(opt.keywords ?? [])]}
                onSelect={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                {opt.leading}
                <span className="truncate">{opt.label}</span>
                {opt.trailing && (
                  <span className="ml-auto pl-2 text-muted-foreground">{opt.trailing}</span>
                )}
                <Check
                  className={cn(
                    "ml-auto h-4 w-4 shrink-0",
                    opt.value === value ? "opacity-100" : "opacity-0",
                    opt.trailing && "ml-2",
                  )}
                  aria-hidden="true"
                />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
