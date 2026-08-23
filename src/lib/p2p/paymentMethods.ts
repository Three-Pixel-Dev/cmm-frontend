/** Payment types that must not appear in user ↔ P2P trade flows. */
export function isCryptoPaymentType(typeName: string | undefined | null): boolean {
  if (!typeName) return false;
  const normalized = typeName.trim().toLowerCase();
  return (
    normalized === "crypto" ||
    normalized.includes("walletconnect") ||
    normalized.includes("metamask")
  );
}

export function filterP2PPaymentMethods<T extends { type: { name: string } }>(methods: T[]): T[] {
  return methods.filter((m) => !isCryptoPaymentType(m.type.name));
}
