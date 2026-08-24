/** Built-in profile pictures. Keep IDs in sync with user-service/internal/avatars. */

export const DEFAULT_AVATARS = [
  { id: "fox", label: "Fox" },
  { id: "cat", label: "Cat" },
  { id: "wolf", label: "Wolf" },
  { id: "frog", label: "Frog" },
  { id: "panda", label: "Panda" },
  { id: "tiger", label: "Tiger" },
  { id: "owl", label: "Owl" },
  { id: "dragon", label: "Dragon" },
  { id: "rabbit", label: "Rabbit" },
  { id: "bear", label: "Bear" },
  { id: "penguin", label: "Penguin" },
  { id: "shark", label: "Shark" },
] as const;

export type DefaultAvatarId = (typeof DEFAULT_AVATARS)[number]["id"];

export function avatarPath(id: DefaultAvatarId | string): string {
  return `/avatars/${id}.svg`;
}

export function parseAvatarId(url?: string | null): DefaultAvatarId | null {
  const value = (url ?? "").trim();
  const match = value.match(/^\/avatars\/([a-z0-9-]+)\.svg$/);
  if (!match) return null;
  const id = match[1] as DefaultAvatarId;
  return DEFAULT_AVATARS.some((a) => a.id === id) ? id : null;
}

export function resolveAvatarSrc(url?: string | null): string | undefined {
  const value = (url ?? "").trim();
  if (!value) return undefined;
  if (parseAvatarId(value)) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return undefined;
}

export function pickRandomAvatarPath(): string {
  const pick = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
  return avatarPath(pick.id);
}
