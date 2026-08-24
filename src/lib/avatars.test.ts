import { describe, expect, it } from "vitest";
import { avatarPath, parseAvatarId, resolveAvatarSrc } from "./avatars";

describe("avatars", () => {
  it("parses preset paths", () => {
    expect(parseAvatarId(avatarPath("fox"))).toBe("fox");
    expect(parseAvatarId("/avatars/not-real.svg")).toBeNull();
    expect(parseAvatarId("https://cdn.example/photo.png")).toBeNull();
  });

  it("resolves display src", () => {
    expect(resolveAvatarSrc("/avatars/cat.svg")).toBe("/avatars/cat.svg");
    expect(resolveAvatarSrc("https://cdn.example/photo.png")).toBe("https://cdn.example/photo.png");
    expect(resolveAvatarSrc("/etc/passwd")).toBeUndefined();
  });
});
