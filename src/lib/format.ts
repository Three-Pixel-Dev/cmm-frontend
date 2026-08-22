const USD_TO_MMK = 1;

export type LedgerKind = "real" | "virtual";

export const fmtKyat = (n: number, digits = 0) =>
  `K ${(n * USD_TO_MMK).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const fmtKyatCompact = (n: number) =>
  `K ${Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n * USD_TO_MMK)}`;

/** Play / virtual wallet credits. */
export const fmtVKyat = (n: number, digits = 0) =>
  `vK ${(n * USD_TO_MMK).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const fmtVKyatCompact = (n: number) =>
  `vK ${Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n * USD_TO_MMK)}`;

export function fmtLedger(
  n: number,
  ledger: LedgerKind,
  opts?: { compact?: boolean; digits?: number },
): string {
  if (ledger === "virtual") {
    return opts?.compact ? fmtVKyatCompact(n) : fmtVKyat(n, opts?.digits ?? 0);
  }
  return opts?.compact ? fmtKyatCompact(n) : fmtKyat(n, opts?.digits ?? 0);
}

// Legacy aliases so all callsites just work
export const fmtUsd = fmtKyat;
export const fmtCompact = fmtKyatCompact;

/** Share counts (not currency). */
export const fmtShares = (n: number) =>
  Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export const fmtPct = (n: number) => `${Math.round(n * 100)}%`;

export const fmtDate = (iso: string, locale = "en") =>
  new Date(iso).toLocaleDateString(locale === "my" ? "my-MM" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/** Masks email for display, e.g. thanhttoo128@gmail.com → thant....8@gmail.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.trim().split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0]}•••@${domain}`;
  const head = local.slice(0, Math.min(5, local.length - 1));
  const tail = local.slice(-1);
  return `${head}....${tail}@${domain}`;
}
