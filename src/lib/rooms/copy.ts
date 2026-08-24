import type { JoinPaymentMode, StakeMode } from "@/lib/api/rooms";
import { fmtKyat } from "@/lib/format";

export function normalizeInviteCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function isPaidJoin(mode: JoinPaymentMode): boolean {
  return mode === "required" || mode === "after";
}

export function joinModeLabel(mode: JoinPaymentMode): string {
  return isPaidJoin(mode) ? "Paid (QR/tab)" : "Free";
}

export function joinFeeCopy(mode: JoinPaymentMode, fee: number): string {
  if (!isPaidJoin(mode)) return "No buy-in";
  return `${fmtKyat(fee)} via host QR`;
}

export function stakeModeLabel(mode: StakeMode | undefined): string {
  return mode === "pay_after" ? "Pay after" : "Prepaid";
}

export function roomSharePath(inviteCode: string): string {
  return `/r/${encodeURIComponent(inviteCode)}`;
}

export function roomTablePath(inviteCode: string): string {
  return `/r/${encodeURIComponent(inviteCode)}/table`;
}
