import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PlayCircle, Search, Coins, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HowItWorksDialog } from "@/components/HowItWorksDialog";

const SEEN_KEY = "cmm_hiw_seen";

const STEPS = [
  {
    icon: Search,
    color: "text-primary",
    bg: "bg-primary/10",
    titleKey: "howItWorks.step1Title",
    descKey: "howItWorks.step1Desc",
    number: "01",
  },
  {
    icon: Coins,
    color: "text-yes",
    bg: "bg-yes/10",
    titleKey: "howItWorks.step2Title",
    descKey: "howItWorks.step2Desc",
    number: "02",
  },
  {
    icon: Trophy,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    titleKey: "howItWorks.step3Title",
    descKey: "howItWorks.step3Desc",
    number: "03",
  },
] as const;

export function HowItWorks() {
  const { t } = useTranslation();
  const [tourOpen, setTourOpen] = useState(false);

  // Auto-open the guided tour once for first-time visitors.
  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setTourOpen(true);
    } catch {
      // ignore privacy / quota errors — the manual trigger still works
    }
  }, []);

  const handleOpenChange = (open: boolean) => {
    setTourOpen(open);
    if (!open) {
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        // ignore
      }
    }
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card px-6 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {t("howItWorks.title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground/80">{t("howItWorks.subtitle")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="font-semibold"
          onClick={() => setTourOpen(true)}
        >
          <PlayCircle className="h-4 w-4" />
          {t("howItWorks.takeTour")}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, color, bg, titleKey, descKey, number }) => (
          <div key={number} className="flex gap-4 items-start">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-widest text-muted-foreground/50 mb-0.5">
                STEP {number}
              </div>
              <div className="text-sm font-semibold">{t(titleKey)}</div>
              <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{t(descKey)}</div>
            </div>
          </div>
        ))}
      </div>

      <HowItWorksDialog open={tourOpen} onOpenChange={handleOpenChange} />
    </section>
  );
}
