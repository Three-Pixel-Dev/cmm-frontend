import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  CircleDollarSign,
  CreditCard,
  Loader2,
  SlidersHorizontal,
  Trophy,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { PaymentMethodsSection } from "@/components/payment/PaymentMethodsSection";
import { PreferencePanel } from "@/components/settings/PreferencePanel";
import { NrcInput } from "@/components/settings/NrcInput";
import { PhoneInput } from "@/components/settings/PhoneInput";
import { BirthDateInput } from "@/components/settings/BirthDateInput";
import { isValidBirthDate } from "@/lib/birthDate";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { profileApi } from "@/lib/api/profile";
import { PROFILE_QUERY_KEY, useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/store/useAuth";
import { useBetMode } from "@/store/useBetMode";
import { cn } from "@/lib/utils";

export type SettingsSection = "preferences" | "profile" | "payment" | "bettingmode";

type SettingsNavItem = {
  key: SettingsSection;
  to: "/settings/profile" | "/settings/payment" | "/settings/preferences" | "/settings/bettingmode";
  label: string;
  icon: typeof UserIcon;
};

type BettingMode = "real" | "virtual";

const BETTING_MODE_OPTIONS: {
  value: BettingMode;
  icon: typeof CircleDollarSign;
  labelKey: "settings.realMode" | "settings.virtualMode";
  descKey: "settings.realModeDesc" | "settings.virtualModeDesc";
}[] = [
  {
    value: "real",
    icon: CircleDollarSign,
    labelKey: "settings.realMode",
    descKey: "settings.realModeDesc",
  },
  {
    value: "virtual",
    icon: Trophy,
    labelKey: "settings.virtualMode",
    descKey: "settings.virtualModeDesc",
  },
];

export function useSettingsNav(): SettingsNavItem[] {
  const { t } = useTranslation();
  return [
    { key: "profile", to: "/settings/profile", label: t("settings.profile"), icon: UserIcon },
    { key: "payment", to: "/settings/payment", label: t("settings.payment"), icon: CreditCard },
    {
      key: "preferences",
      to: "/settings/preferences",
      label: t("settings.preferences"),
      icon: SlidersHorizontal,
    },
  ];
}

const navItemBase =
  "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-full";
const navItemActive = "bg-elevated text-foreground";
const navItemInactive = "text-muted-foreground hover:bg-elevated/60 hover:text-foreground";

/** URL-driven nav used by the settings page. Active state follows the route. */
export function SettingsNavLinks({ className }: { className?: string }) {
  const { t } = useTranslation();
  const nav = useSettingsNav();

  return (
    <nav className={cn("space-y-1", className)} aria-label={t("settings.title")}>
      {nav.map((n) => {
        const Icon = n.icon;
        return (
          <Link
            key={n.key}
            to={n.to}
            className={navItemBase}
            activeProps={{ className: navItemActive }}
            inactiveProps={{ className: navItemInactive }}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PreferencesSettingsSection() {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
      <h2 className="mb-1 text-base font-semibold">{t("settings.preferences")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{t("settings.preferencesDesc")}</p>
      <PreferencePanel compact />
    </div>
  );
}

export function BettingModeSettingsSection() {
  const { t } = useTranslation();
  const mode = useBetMode((s) => s.mode);
  const setMode = useBetMode((s) => s.setMode);
  const [changedMode, setChangedMode] = useState<BettingMode | null>(null);
  const groupId = "settings-betting-mode";
  const changedModeLabel = changedMode
    ? t(changedMode === "real" ? "settings.realMode" : "settings.virtualMode")
    : "";

  return (
    <>
      <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
        <h2 className="mb-1 text-base font-semibold">{t("settings.bettingMode")}</h2>
        <p id={`${groupId}-desc`} className="mb-6 text-sm text-muted-foreground">
          {t("settings.bettingModeDesc")}
        </p>

        <RadioGroup
          value={mode}
          onValueChange={(v) => {
            const nextMode = v as BettingMode;
            if (nextMode === mode) return;
            setMode(nextMode);
            setChangedMode(nextMode);
          }}
          className="grid gap-2 sm:grid-cols-2"
          aria-describedby={`${groupId}-desc`}
        >
          <span className="sr-only">{t("settings.bettingMode")}</span>
          {BETTING_MODE_OPTIONS.map((opt) => {
            const itemId = `${groupId}-${opt.value}`;
            const selected = mode === opt.value;
            const Icon = opt.icon;
            return (
              <div key={opt.value}>
                <RadioGroupItem value={opt.value} id={itemId} className="peer sr-only" />
                <Label
                  htmlFor={itemId}
                  className={cn(
                    "flex min-h-[104px] cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-elevated/30 px-4 py-4 transition-colors",
                    "hover:bg-elevated/60 hover:border-border",
                    "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                    selected && "border-primary bg-primary/10 shadow-sm",
                  )}
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 text-left">
                    <span className="block text-sm font-semibold">{t(opt.labelKey)}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {t(opt.descKey)}
                    </span>
                  </span>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      <Dialog open={changedMode !== null} onOpenChange={(open) => !open && setChangedMode(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("settings.bettingModeChanged")}</DialogTitle>
            <DialogDescription>
              {t("settings.bettingModeChangedDesc", { mode: changedModeLabel })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setChangedMode(null)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ProfileSettingsSection() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);

  const profileQ = useProfile();

  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [nrc, setNrc] = useState("");
  const [passport, setPassport] = useState("");
  const [address, setAddress] = useState("");
  const [nationality, setNationality] = useState("");

  useEffect(() => {
    const p = profileQ.data;
    if (!p) return;
    setDateOfBirth(p.date_of_birth ?? "");
    setGender(p.gender ?? "");
    setPhone(p.phone_number ?? "");
    setNrc(p.nrc ?? "");
    setPassport(p.passport ?? "");
    setAddress(p.address ?? "");
    setNationality(p.nationality ?? "");
  }, [profileQ.data]);

  const saveM = useMutation({
    mutationFn: () => {
      if (dateOfBirth && !isValidBirthDate(dateOfBirth)) {
        throw new Error(t("settings.birthDateInvalid"));
      }
      return profileApi.upsertMine({
        date_of_birth: dateOfBirth || undefined,
        gender: gender || undefined,
        phone_number: phone || undefined,
        nrc: nrc || undefined,
        passport: passport || undefined,
        address: address || undefined,
        nationality: nationality || undefined,
      });
    },
    onSuccess: () => {
      toast.success(t("settings.profileSaved"));
      qc.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (profileQ.isLoading) {
    return (
      <div className="flex justify-center py-16" role="status">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        <span className="sr-only">{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
        <h2 className="mb-1 text-base font-semibold">{t("settings.account")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("settings.accountDesc")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("settings.name")}</Label>
            <Input value={user?.name ?? ""} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>{t("login.email")}</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveM.mutate();
        }}
        className="space-y-4 rounded-xl border border-border/60 bg-card p-5"
      >
        <div>
          <h2 className="text-base font-semibold">{t("settings.profile")}</h2>
          <p className="text-sm text-muted-foreground">{t("settings.profileDesc")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="settings-profile-dob">{t("settings.dateOfBirth")}</Label>
            <BirthDateInput
              id="settings-profile-dob"
              value={dateOfBirth}
              onChange={setDateOfBirth}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-profile-gender">{t("settings.gender")}</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger id="settings-profile-gender">
                <SelectValue placeholder={t("settings.genderPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t("settings.male")}</SelectItem>
                <SelectItem value="female">{t("settings.female")}</SelectItem>
                <SelectItem value="other">{t("settings.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-profile-phone">{t("settings.phone")}</Label>
            <PhoneInput id="settings-profile-phone" value={phone} onChange={setPhone} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-profile-nationality">{t("settings.nationality")}</Label>
            <Select value={nationality} onValueChange={setNationality}>
              <SelectTrigger id="settings-profile-nationality">
                <SelectValue placeholder={t("settings.nationalityPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MYANMAR">{t("settings.myanmar")}</SelectItem>
                <SelectItem value="OTHERS">{t("settings.others")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-profile-passport">{t("settings.passport")}</Label>
            <Input
              id="settings-profile-passport"
              value={passport}
              onChange={(e) => setPassport(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="settings-profile-nrc-state">{t("settings.nrc")}</Label>
          <NrcInput id="settings-profile-nrc-state" value={nrc} onChange={setNrc} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="settings-profile-address">{t("settings.address")}</Label>
          <Textarea
            id="settings-profile-address"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <Button type="submit" className="font-semibold" disabled={saveM.isPending}>
          {saveM.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t("settings.saving")}
            </>
          ) : (
            t("settings.save")
          )}
        </Button>
      </form>
    </div>
  );
}

export function PaymentSettingsSection() {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
      <h2 className="mb-1 text-base font-semibold">{t("settings.payment")}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{t("settings.paymentDesc")}</p>
      <PaymentMethodsSection embedded />
    </div>
  );
}
