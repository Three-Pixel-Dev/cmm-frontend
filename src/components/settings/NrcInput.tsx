import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EMPTY_NRC_DATA } from "@/data/nrc";
import { useNrcData } from "@/hooks/useNrc";
import {
  composeNrc,
  localizeDigits,
  parseNrc,
  toWesternDigits,
  townshipsForState,
  EMPTY_NRC,
  type NrcLang,
  type NrcParts,
} from "@/lib/nrc";

interface NrcInputProps {
  value: string;
  onChange: (value: string) => void;
  /** id for the first control, so an external <Label> can point at the field. */
  id?: string;
}

// NRC is a Myanmar national ID — always render its parts in Myanmar script
// (English names are still searchable via each option's keywords).
const LANG: NrcLang = "mm";

export function NrcInput({ value, onChange, id }: NrcInputProps) {
  const { t } = useTranslation();
  const uid = useId();
  const { data, isLoading } = useNrcData();
  const nrc = data ?? EMPTY_NRC_DATA;

  const [parts, setParts] = useState<NrcParts>(EMPTY_NRC);
  // Tracks the last string we synced with so external resets (profile load)
  // re-parse once data is available, but our own edits don't re-parse.
  const lastSync = useRef<string | null>(null);

  useEffect(() => {
    if (!data) return;
    if (lastSync.current !== value) {
      setParts(parseNrc(data, value));
      lastSync.current = value;
    }
  }, [data, value]);

  const emit = (next: NrcParts) => {
    setParts(next);
    const composed = composeNrc(nrc, next, LANG);
    lastSync.current = composed;
    onChange(composed);
  };

  const stateOptions: ComboboxOption[] = nrc.states.map((s) => ({
    value: s.id,
    label: s.number[LANG],
    keywords: [s.number.en, s.name.en, s.name.mm],
  }));

  const townshipOptions: ComboboxOption[] = townshipsForState(nrc, parts.stateId, LANG).map(
    (tw) => ({
      value: tw.id,
      label: `(${tw.short[LANG]}) ${tw.name[LANG]}`,
      keywords: [tw.short.en, tw.short.mm, tw.name.en, tw.name.mm],
    }),
  );

  const handleNumber = (raw: string) => {
    const digits = toWesternDigits(raw).replace(/\D/g, "").slice(0, 6);
    emit({ ...parts, number: digits });
  };

  const stateId = id ?? `${uid}-state`;
  const preview = composeNrc(nrc, parts, LANG);

  return (
    <fieldset className="space-y-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-12">
        <div className="col-span-1 space-y-1.5 sm:col-span-3">
          <Label htmlFor={stateId} className="text-xs text-muted-foreground">
            {t("settings.nrcState")}
          </Label>
          <Combobox
            id={stateId}
            options={stateOptions}
            value={parts.stateId}
            onChange={(stateId) => emit({ ...parts, stateId, townshipId: "" })}
            placeholder={t("settings.nrcStatePlaceholder")}
            searchPlaceholder={t("settings.searchPlaceholder")}
            emptyText={t("settings.nrcNoResults")}
            disabled={isLoading}
          />
        </div>

        <div className="col-span-2 space-y-1.5 sm:col-span-4">
          <Label htmlFor={`${uid}-township`} className="text-xs text-muted-foreground">
            {t("settings.nrcTownship")}
          </Label>
          <Combobox
            id={`${uid}-township`}
            options={townshipOptions}
            value={parts.townshipId}
            onChange={(townshipId) => emit({ ...parts, townshipId })}
            placeholder={t("settings.nrcTownshipPlaceholder")}
            searchPlaceholder={t("settings.searchPlaceholder")}
            emptyText={t("settings.nrcNoResults")}
            disabled={isLoading || !parts.stateId}
          />
        </div>

        <div className="col-span-1 space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${uid}-type`} className="text-xs text-muted-foreground">
            {t("settings.nrcType")}
          </Label>
          <Select
            value={parts.typeId}
            onValueChange={(typeId) => emit({ ...parts, typeId })}
            disabled={isLoading}
          >
            <SelectTrigger id={`${uid}-type`}>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {nrc.types.map((ty) => (
                <SelectItem key={ty.id} value={ty.id}>
                  {ty.name[LANG]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-1 space-y-1.5 sm:col-span-3">
          <Label htmlFor={`${uid}-number`} className="text-xs text-muted-foreground">
            {t("settings.nrcNumber")}
          </Label>
          <Input
            id={`${uid}-number`}
            inputMode="numeric"
            autoComplete="off"
            placeholder="123456"
            value={localizeDigits(parts.number, LANG)}
            onChange={(e) => handleNumber(e.target.value)}
            className="tabular-nums"
          />
        </div>
      </div>

      {preview && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {t("settings.nrcPreview")}{" "}
          <span className="font-semibold text-foreground">{preview}</span>
        </p>
      )}
    </fieldset>
  );
}
