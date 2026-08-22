const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

export function daysInMonth(month: number, year: number): number {
  if (month < 1 || month > 12) return 31;
  return new Date(year, month, 0).getDate();
}

export function parseBirthDate(iso?: string | null): {
  day: string;
  month: string;
  year: string;
} {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return { day: "", month: "", year: "" };
  }
  const [year, month, day] = iso.split("-");
  return { day: String(Number(day)), month: String(Number(month)), year };
}

export function birthDateFromParts(
  day: string,
  month: string,
  year: string,
): string | undefined {
  if (!day || !month || !year) return undefined;
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return undefined;
  if (d < 1 || m < 1 || m > 12 || y < 1900) return undefined;
  if (d > daysInMonth(m, y)) return undefined;
  const iso = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  if (parsed > new Date()) return undefined;
  return iso;
}

export function isValidBirthDate(iso: string): boolean {
  return birthDateFromParts(
    parseBirthDate(iso).day,
    parseBirthDate(iso).month,
    parseBirthDate(iso).year,
  ) === iso;
}

export function birthYearOptions(minAge = 0, maxAge = 150): number[] {
  const now = new Date().getFullYear();
  const years: number[] = [];
  for (let y = now - minAge; y >= now - maxAge; y--) {
    years.push(y);
  }
  return years;
}

export { MONTHS };
