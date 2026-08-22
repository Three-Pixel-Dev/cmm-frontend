import type { JoinPaymentMode, StakeMode } from "@/lib/api/rooms";
import { fmtKyat } from "@/lib/format";

export function normalizeInviteCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function joinModeLabel(mode: JoinPaymentMode): string {
  if (mode === "required") return "Pay now";
  if (mode === "after") return "Pay later";
  return "Free";
}

export function joinFeeCopy(mode: JoinPaymentMode, fee: number): string {
  if (mode === "free") return "No buy-in";
  if (mode === "after") return `${fmtKyat(fee)} on tab`;
  return `${fmtKyat(fee)} to sit`;
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
