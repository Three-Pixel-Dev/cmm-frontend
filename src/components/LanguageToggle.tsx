import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { setAppLanguage } from "@/lib/locale";

/** Compact language switcher in the navbar. */
export function LanguageToggle() {
  const { i18n } = useTranslation();
  const lang = i18n.language === "my" ? "my" : "en";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          aria-label={`Language: ${lang === "my" ? "Myanmar" : "English"}`}
        >
          <Languages className="h-4 w-4" aria-hidden />
          <span className="text-xs font-semibold uppercase">{lang === "my" ? "MM" : "EN"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuItem onClick={() => setAppLanguage("en")}>English</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setAppLanguage("my")}>မြန်မာ</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
