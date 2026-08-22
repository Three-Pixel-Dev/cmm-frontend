import { useTranslation } from "react-i18next";
import { Monitor, Moon, Sun } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme } from "@/hooks/useTheme";
import { getAppLanguage, setAppLanguage, type AppLanguage } from "@/lib/locale";
import type { ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Languages } from "lucide-react";

const THEME_OPTIONS: {
  value: ThemeMode;
  icon: typeof Sun;
  labelKey: "settings.lightMode" | "settings.darkMode" | "settings.systemMode";
  hintKey?: "settings.systemModeHint";
}[] = [
  { value: "light", icon: Sun, labelKey: "settings.lightMode" },
  { value: "dark", icon: Moon, labelKey: "settings.darkMode" },
  {
    value: "system",
    icon: Monitor,
    labelKey: "settings.systemMode",
  },
];

const LANGUAGE_OPTIONS: {
  value: AppLanguage;
  labelKey: "settings.english" | "settings.burmese";
  native: string;
}[] = [
  { value: "en", labelKey: "settings.english", native: "English" },
  { value: "my", labelKey: "settings.burmese", native: "မြန်မာ" },
];

export function PreferencePanel({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const language = getAppLanguage();

  const themeGroupId = "settings-theme";
  const langGroupId = "settings-language";

  return (
    <div className={cn(compact ? "space-y-6" : "space-y-8", className)}>
      <fieldset>
        <legend className="text-sm font-semibold">{t("settings.appearance")}</legend>
        <p id={`${themeGroupId}-desc`} className="mt-1 text-sm text-muted-foreground">
          {t("settings.appearanceDesc")}
        </p>
        <RadioGroup
          value={theme}
          onValueChange={(v) => setTheme(v as ThemeMode)}
          className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-3"
          aria-describedby={`${themeGroupId}-desc`}
        >
          <span className="sr-only">{t("common.theme")}</span>
          {THEME_OPTIONS.map((opt) => {
            const itemId = `${themeGroupId}-${opt.value}`;
            const selected = theme === opt.value;
            const Icon = opt.icon;
            return (
              <div key={opt.value}>
                <RadioGroupItem value={opt.value} id={itemId} className="peer sr-only" />
                <Label
                  htmlFor={itemId}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-border/60 bg-elevated/30 px-3 py-4 text-center transition-colors",
                    "hover:bg-elevated/60 hover:border-border",
                    "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                    selected && "border-primary bg-primary/10 text-foreground shadow-sm",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  <span className="text-sm font-medium leading-tight">{t(opt.labelKey)}</span>
                  {opt.hintKey && (
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      {t(opt.hintKey)}
                    </span>
                  )}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold">{t("common.language")}</legend>
        <p id={`${langGroupId}-desc`} className="mt-1 text-sm text-muted-foreground">
          {t("settings.languageDesc")}
        </p>
        <RadioGroup
          value={language}
          onValueChange={(v) => setAppLanguage(v as AppLanguage)}
          className="mt-4 grid grid-cols-2 gap-2"
          aria-describedby={`${langGroupId}-desc`}
        >
          <span className="sr-only">{t("common.language")}</span>
          {LANGUAGE_OPTIONS.map((opt) => {
            const itemId = `${langGroupId}-${opt.value}`;
            const selected = language === opt.value;
            return (
              <div key={opt.value}>
                <RadioGroupItem value={opt.value} id={itemId} className="peer sr-only" />
                <Label
                  htmlFor={itemId}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-elevated/30 px-4 py-3 transition-colors",
                    "hover:bg-elevated/60 hover:border-border",
                    "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                    selected && "border-primary bg-primary/10 shadow-sm",
                  )}
                >
                  <Languages className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 text-left">
                    <span className="block text-sm font-medium">{t(opt.labelKey)}</span>
                    <span className="block text-xs text-muted-foreground">{opt.native}</span>
                  </span>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
        <p className="sr-only" aria-live="polite">
          {i18n.language === "my" ? t("settings.burmese") : t("settings.english")}
        </p>
      </fieldset>
    </div>
  );
}
