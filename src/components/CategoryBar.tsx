import { useTranslation } from "react-i18next";
import type { ApiMarketCategory } from "@/types/market-api";
import { cn } from "@/lib/utils";
import { Flame, Vote, Bitcoin, Trophy, Music, Cpu, Globe, LineChart } from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  trending: Flame,
  politics: Vote,
  crypto: Bitcoin,
  sports: Trophy,
  pop: Music,
  tech: Cpu,
  world: Globe,
  economy: LineChart,
  general: Globe,
};

export type CategoryFilterId = "all" | "trending" | string;

export function CategoryBar({
  categories,
  selectedId,
  onSelect,
}: {
  categories: ApiMarketCategory[];
  selectedId: CategoryFilterId;
  onSelect: (id: CategoryFilterId) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "my" ? "my" : "en";

  const pseudoItems: { id: CategoryFilterId; label: string; iconKey: string }[] = [
    { id: "all", label: t("categories.all"), iconKey: "world" },
    { id: "trending", label: t("categories.trending"), iconKey: "trending" },
  ];

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {pseudoItems.map((item) => {
        const Icon = ICONS[item.iconKey];
        const active = selectedId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-elevated text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {item.label}
          </button>
        );
      })}
      {categories.map((c) => {
        const Icon = ICONS[c.slug] ?? Globe;
        const active = selectedId === c.id;
        const label = lang === "my" && c.title_my ? c.title_my : c.title_en;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-elevated text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
