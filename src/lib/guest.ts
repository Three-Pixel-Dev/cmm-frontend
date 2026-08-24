export const GUEST_EMAIL_DOMAIN = "@guest.cmm.com";

export function isGuestEmail(email?: string | null): boolean {
  return (email ?? "").trim().toLowerCase().endsWith(GUEST_EMAIL_DOMAIN);
}
