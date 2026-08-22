/** Stable per bet attempt — reuse on client retries for the same click. */
export function newBetIdempotencyKey(): string {
  return crypto.randomUUID();
}
