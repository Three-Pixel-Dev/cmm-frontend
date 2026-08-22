import type { NrcData, NrcState, NrcTownship, NrcType } from "@/data/nrc";

export type NrcLang = "en" | "mm";

/** Parsed selection backing the NRC field. */
export interface NrcParts {
  stateId: string;
  townshipId: string;
  typeId: string;
  /** Up to 6 digits, stored canonically in Western numerals. */
  number: string;
}

export const EMPTY_NRC: NrcParts = { stateId: "", townshipId: "", typeId: "", number: "" };

const MM_DIGITS = "၀၁၂၃၄၅၆၇၈၉";

/** Convert any Myanmar numerals in a string to Western (0-9). */
export function toWesternDigits(s: string): string {
  return s.replace(/[၀-၉]/g, (d) => String(d.charCodeAt(0) - 0x1040));
}

/** Convert Western numerals to Myanmar numerals. */
export function toMyanmarDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => MM_DIGITS[Number(d)]);
}

export function localizeDigits(s: string, lang: NrcLang): string {
  return lang === "mm" ? toMyanmarDigits(s) : s;
}

/** Townships belonging to the given state, ordered by display name. */
export function townshipsForState(data: NrcData, stateId: string, lang: NrcLang): NrcTownship[] {
  const state = data.states.find((s) => s.id === stateId);
  if (!state) return [];
  return data.townships
    .filter((t) => t.stateNumber === state.number.en)
    .sort((a, b) => a.name[lang].localeCompare(b.name[lang]));
}

/** Build the canonical NRC string, e.g. `13/SAKHANA(N)123456` or `၁၃/...`. */
export function composeNrc(data: NrcData, parts: NrcParts, lang: NrcLang): string {
  const state = data.states.find((s) => s.id === parts.stateId);
  const township = data.townships.find((t) => t.id === parts.townshipId);
  const type = data.types.find((t) => t.id === parts.typeId);
  if (!state || !township || !type || !parts.number) return "";
  const num = localizeDigits(parts.number, lang);
  return `${state.number[lang]}/${township.short[lang]}(${type.name[lang]})${num}`;
}

export function isCompleteNrc(parts: NrcParts): boolean {
  return Boolean(parts.stateId && parts.townshipId && parts.typeId && parts.number.length === 6);
}

const norm = (s: string) => toWesternDigits(s).trim().toUpperCase();

function findState(data: NrcData, numberToken: string): NrcState | undefined {
  const western = toWesternDigits(numberToken).trim();
  return data.states.find((s) => s.number.en === western || s.number.mm === numberToken.trim());
}

function findTownship(
  data: NrcData,
  shortToken: string,
  state: NrcState | undefined,
): NrcTownship | undefined {
  const candidates = state
    ? data.townships.filter((t) => t.stateNumber === state.number.en)
    : data.townships;
  const token = shortToken.trim();
  const upper = norm(token);
  return candidates.find((t) => norm(t.short.en) === upper || t.short.mm.trim() === token);
}

function findType(data: NrcData, typeToken: string): NrcType | undefined {
  const token = typeToken.trim();
  const upper = token.toUpperCase();
  return data.types.find((t) => t.name.en.toUpperCase() === upper || t.name.mm.trim() === token);
}

/**
 * Best-effort parse of a stored NRC string back into selectable parts so the
 * field can be pre-filled. Tolerates English or Myanmar script and legacy
 * free-text values; any part that cannot be matched is left blank.
 */
export function parseNrc(data: NrcData, value: string | null | undefined): NrcParts {
  if (!value) return { ...EMPTY_NRC };
  const match = value.match(/^\s*([^/]+)\/\s*([^()]*)\(([^)]*)\)\s*([\d၀-၉]*)\s*$/);
  if (!match) return { ...EMPTY_NRC };
  const [, stateToken, shortToken, typeToken, numberToken] = match;
  const state = findState(data, stateToken);
  const township = findTownship(data, shortToken, state);
  const type = findType(data, typeToken);
  return {
    stateId: state?.id ?? "",
    townshipId: township?.id ?? "",
    typeId: type?.id ?? "",
    number: toWesternDigits(numberToken).slice(0, 6),
  };
}
