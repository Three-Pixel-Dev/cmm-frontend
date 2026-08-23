import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/useTheme";
import type { ThemeMode } from "@/lib/theme";

const THEME_LABEL_KEYS: Record<
  ThemeMode,
  "settings.lightMode" | "settings.darkMode" | "settings.systemMode"
> = {
  light: "settings.lightMode",
  dark: "settings.darkMode",
  system: "settings.systemMode",
};

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const Icon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className ?? "h-8 w-8"}
          aria-label={`${t("common.theme")}: ${t(THEME_LABEL_KEYS[theme])}`}
          title={`${t("common.theme")}: ${t(THEME_LABEL_KEYS[theme])}`}
        >
          <Icon
            key={resolvedTheme}
            className="h-4 w-4 transition-transform duration-300 motion-reduce:transition-none"
            aria-hidden="true"
          />
          <span className="sr-only">Current theme: {resolvedTheme}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {t("settings.appearance")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemeMode)}>
          <DropdownMenuRadioItem value="light" className="gap-2">
            <Sun className="h-4 w-4" aria-hidden="true" /> {t("settings.lightMode")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className="gap-2">
            <Moon className="h-4 w-4" aria-hidden="true" /> {t("settings.darkMode")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system" className="gap-2">
            <Monitor className="h-4 w-4" aria-hidden="true" /> {t("settings.systemMode")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
