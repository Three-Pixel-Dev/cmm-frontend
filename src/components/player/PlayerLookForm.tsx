import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AvatarPicker } from "@/components/player/AvatarPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROFILE_QUERY_KEY, useProfile } from "@/hooks/useProfile";
import { ROOM_MEMBERS_KEY, ROOM_MESSAGES_KEY } from "@/hooks/useRooms";
import { profileApi } from "@/lib/api/profile";
import { usersApi } from "@/lib/api/users";
import { parseAvatarId, avatarPath } from "@/lib/avatars";
import { useAuth } from "@/store/useAuth";

export function PlayerLookForm({ onSaved, compact }: { onSaved?: () => void; compact?: boolean }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const profileQ = useProfile();

  const [name, setName] = useState(user?.name ?? "");
  const [avatar, setAvatar] = useState("");

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  useEffect(() => {
    const current = parseAvatarId(profileQ.data?.profile_url);
    if (current) setAvatar(avatarPath(current));
  }, [profileQ.data?.profile_url]);

  const saveM = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (trimmed.length < 2) {
        throw new Error(t("settings.nicknameTooShort"));
      }
      if (!parseAvatarId(avatar)) {
        throw new Error(t("settings.pickProfile"));
      }
      const [updated] = await Promise.all([
        usersApi.updateMe({ name: trimmed }),
        profileApi.upsertMine({ profile_url: avatar }),
      ]);
      return updated;
    },
    onSuccess: (updated) => {
      setUser(updated);
      toast.success(t("settings.lookSaved"));
      void qc.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      void qc.invalidateQueries({ queryKey: [ROOM_MEMBERS_KEY] });
      void qc.invalidateQueries({ queryKey: [ROOM_MESSAGES_KEY] });
      onSaved?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        saveM.mutate();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="player-look-nickname">{t("settings.nickname")}</Label>
        <Input
          id="player-look-nickname"
          value={name}
          maxLength={64}
          autoComplete="nickname"
          onChange={(e) => setName(e.target.value)}
          placeholder={t("settings.nicknamePlaceholder")}
        />
      </div>
      <div className="space-y-2">
        <Label>{t("settings.defaultProfile")}</Label>
        <p className="text-xs text-muted-foreground">{t("settings.defaultProfileDesc")}</p>
        <AvatarPicker value={avatar} onChange={setAvatar} disabled={saveM.isPending} />
      </div>
      <Button type="submit" className="font-semibold" disabled={saveM.isPending}>
        {saveM.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t("settings.saving")}
          </>
        ) : compact ? (
          t("settings.saveLook")
        ) : (
          t("settings.save")
        )}
      </Button>
    </form>
  );
}
