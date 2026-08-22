import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  birthDateFromParts,
  birthYearOptions,
  daysInMonth,
  MONTHS,
  parseBirthDate,
} from "@/lib/birthDate";
import { cn } from "@/lib/utils";

type BirthDateInputProps = {
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export function BirthDateInput({
  id,
  value = "",
  onChange,
  disabled,
  className,
}: BirthDateInputProps) {
  const { t } = useTranslation();
  const parsed = parseBirthDate(value);
  const [day, setDay] = useState(parsed.day);
  const [month, setMonth] = useState(parsed.month);
  const [year, setYear] = useState(parsed.year);

  useEffect(() => {
    const p = parseBirthDate(value);
    setDay(p.day);
    setMonth(p.month);
    setYear(p.year);
  }, [value]);

  const years = useMemo(() => birthYearOptions(), []);
  const maxDay = useMemo(() => {
    if (!month || !year) return 31;
    return daysInMonth(Number(month), Number(year));
  }, [month, year]);

  const update = (nextDay: string, nextMonth: string, nextYear: string) => {
    setDay(nextDay);
    setMonth(nextMonth);
    setYear(nextYear);
    const iso = birthDateFromParts(nextDay, nextMonth, nextYear);
    onChange(iso ?? "");
  };

  const dayOptions = Array.from({ length: maxDay }, (_, i) => String(i + 1));

  return (
    <div id={id} className={cn("grid grid-cols-3 gap-2", className)}>
      <Select
        value={day}
        onValueChange={(v) => {
          update(v, month, year);
        }}
        disabled={disabled}
      >
        <SelectTrigger aria-label={t("settings.birthDay")}>
          <SelectValue placeholder={t("settings.birthDay")} />
        </SelectTrigger>
        <SelectContent>
          {dayOptions.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={month}
        onValueChange={(v) => {
          const max = year ? daysInMonth(Number(v), Number(year)) : 31;
          const nextDay = day && Number(day) > max ? String(max) : day;
          update(nextDay, v, year);
        }}
        disabled={disabled}
      >
        <SelectTrigger aria-label={t("settings.birthMonth")}>
          <SelectValue placeholder={t("settings.birthMonth")} />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {t(`settings.months.${m.value}`, { defaultValue: m.label })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={year}
        onValueChange={(v) => {
          const max = month ? daysInMonth(Number(month), Number(v)) : 31;
          const nextDay = day && Number(day) > max ? String(max) : day;
          update(nextDay, month, v);
        }}
        disabled={disabled}
      >
        <SelectTrigger aria-label={t("settings.birthYear")}>
          <SelectValue placeholder={t("settings.birthYear")} />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
