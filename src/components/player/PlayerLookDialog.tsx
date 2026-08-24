import { useTranslation } from "react-i18next";
import { PlayerLookForm } from "@/components/player/PlayerLookForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PlayerLookDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("settings.lookTitle")}</DialogTitle>
          <DialogDescription>{t("settings.lookDesc")}</DialogDescription>
        </DialogHeader>
        <PlayerLookForm compact onSaved={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
