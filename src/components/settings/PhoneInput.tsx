import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { COUNTRIES, DEFAULT_COUNTRY_ISO2, flagEmoji, type Country } from "@/data/countries";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

const byIso = (iso2: string): Country =>
  COUNTRIES.find((c) => c.iso2 === iso2) ??
  COUNTRIES.find((c) => c.iso2 === DEFAULT_COUNTRY_ISO2) ??
  COUNTRIES[0];

interface ParsedPhone {
  iso2: string;
  number: string;
}

function parsePhone(value: string): ParsedPhone {
  const v = (value ?? "").trim();
  if (!v) return { iso2: DEFAULT_COUNTRY_ISO2, number: "" };
  if (v.startsWith("+")) {
    const rest = v.slice(1).replace(/\s+/g, "");
    // Prefer the longest matching dial code (e.g. 95 before 9).
    const match = [...COUNTRIES]
      .sort((a, b) => b.dial.length - a.dial.length)
      .find((c) => rest.startsWith(c.dial));
    if (match) return { iso2: match.iso2, number: rest.slice(match.dial.length) };
    return { iso2: DEFAULT_COUNTRY_ISO2, number: rest };
  }
  // Legacy bare local number — assume the default country.
  return { iso2: DEFAULT_COUNTRY_ISO2, number: v.replace(/\D/g, "") };
}

export function PhoneInput({ value, onChange, id }: PhoneInputProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedPhone>(() => parsePhone(value));
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      setParsed(parsePhone(value));
      lastEmitted.current = value;
    }
  }, [value]);

  const country = byIso(parsed.iso2);

  const emit = (next: ParsedPhone) => {
    setParsed(next);
    const dial = byIso(next.iso2).dial;
    const composed = next.number ? `+${dial} ${next.number}` : "";
    lastEmitted.current = composed;
    onChange(composed);
  };

  return (
    <div className="flex h-9 w-full items-center rounded-md border border-input bg-transparent shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label={t("settings.phoneCountry")}
            className="flex h-full shrink-0 items-center gap-1.5 rounded-l-md border-r border-input px-3 text-sm cursor-pointer transition-colors hover:bg-accent focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <span className="text-base leading-none" aria-hidden="true">
              {flagEmoji(country.iso2)}
            </span>
            <span className="tabular-nums text-muted-foreground">+{country.dial}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[280px] p-0">
          <Command
            filter={(val, search, keywords) => {
              const haystack = `${val} ${(keywords ?? []).join(" ")}`.toLowerCase();
              return haystack.includes(search.toLowerCase()) ? 1 : 0;
            }}
          >
            <CommandInput placeholder={t("settings.phoneCountrySearch")} />
            <CommandList>
              <CommandEmpty>{t("settings.nrcNoResults")}</CommandEmpty>
              {COUNTRIES.map((c) => (
                <CommandItem
                  key={c.iso2}
                  value={c.iso2}
                  keywords={[c.name, c.dial, c.iso2]}
                  onSelect={() => {
                    emit({ ...parsed, iso2: c.iso2 });
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <span className="text-base leading-none" aria-hidden="true">
                    {flagEmoji(c.iso2)}
                  </span>
                  <span className="truncate">{c.name}</span>
                  <span className="ml-auto pl-2 tabular-nums text-muted-foreground">+{c.dial}</span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={t("settings.phonePlaceholder")}
        value={parsed.number}
        onChange={(e) => emit({ ...parsed, number: e.target.value.replace(/\D/g, "") })}
        className="h-full w-full min-w-0 flex-1 rounded-r-md bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
