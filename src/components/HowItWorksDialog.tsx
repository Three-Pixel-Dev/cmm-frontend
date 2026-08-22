import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Check, Coins, Search, Trophy } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StepVisual = "market" | "trade" | "collect";

const STEPS: ReadonlyArray<{
  icon: typeof Search;
  visual: StepVisual;
  titleKey: string;
  descKey: string;
}> = [
  {
    icon: Search,
    visual: "market",
    titleKey: "howItWorks.step1Title",
    descKey: "howItWorks.step1Desc",
  },
  {
    icon: Coins,
    visual: "trade",
    titleKey: "howItWorks.step2Title",
    descKey: "howItWorks.step2Desc",
  },
  {
    icon: Trophy,
    visual: "collect",
    titleKey: "howItWorks.step3Title",
    descKey: "howItWorks.step3Desc",
  },
];

// Premium glass/elevated surface shared by the step illustrations.
const VISUAL_CARD =
  "relative rounded-2xl bg-gradient-to-b from-elevated to-card p-4 ring-1 ring-border/70 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)] before:pointer-events-none before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-foreground/15 before:to-transparent";

interface HowItWorksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HowItWorksDialog({ open, onOpenChange }: HowItWorksDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const isLast = step === total - 1;

  // Reset to the first step whenever the tour is reopened.
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const goNext = useCallback(() => {
    setStep((s) => (s >= total - 1 ? s : s + 1));
  }, [total]);

  const goBack = useCallback(() => {
    setStep((s) => (s <= 0 ? s : s - 1));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      }
    },
    [goNext, goBack],
  );

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden rounded-2xl border-border/60 p-0 shadow-2xl sm:max-w-md"
        onKeyDown={handleKeyDown}
      >
        {/* Stable accessible name for the dialog; the per-step heading below is the
            live-announced content. */}
        <DialogTitle className="sr-only">{t("howItWorks.tourTitle")}</DialogTitle>

        {/* Illustration stage — pointer-events-none so tall step-3 art does not block the X */}
        <div className="pointer-events-none relative flex h-60 items-center justify-center overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(115% 78% at 50% -12%, color-mix(in oklch, var(--primary) 22%, transparent), transparent 62%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(color-mix(in oklch, var(--foreground) 8%, transparent) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
              maskImage: "radial-gradient(circle at 50% 38%, black, transparent 72%)",
              WebkitMaskImage: "radial-gradient(circle at 50% 38%, black, transparent 72%)",
            }}
          />
          <div
            key={current.visual}
            className="relative z-10 w-full px-8 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-1 motion-safe:duration-500"
          >
            <StepVisualCard visual={current.visual} />
          </div>
        </div>

        <div className="px-6 pb-6 pt-1">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm ring-1 ring-primary/20">
              <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t("howItWorks.stepCount", { current: step + 1, total })}
            </span>
          </div>

          {/* aria-live so screen readers announce each step as it changes */}
          <div aria-live="polite" aria-atomic="true">
            <h2 className="text-xl font-bold tracking-tight">{t(current.titleKey)}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {t(current.descKey)}
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/50 pt-5">
            {/* Progress dots */}
            <div
              className="flex items-center gap-2"
              role="tablist"
              aria-label={t("howItWorks.tourTitle")}
            >
              {STEPS.map((s, i) => (
                <button
                  key={s.visual}
                  type="button"
                  role="tab"
                  aria-selected={i === step}
                  aria-label={t("howItWorks.goToStep", { number: i + 1 })}
                  onClick={() => setStep(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    i === step
                      ? "w-7 bg-gradient-to-r from-primary to-yes shadow-sm shadow-primary/40"
                      : "w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/50",
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button variant="ghost" size="sm" onClick={goBack}>
                  <ArrowLeft className="h-4 w-4" />
                  {t("howItWorks.back")}
                </Button>
              )}
              {isLast ? (
                <DialogClose asChild>
                  <Button size="sm" className="font-semibold shadow-lg shadow-primary/30">
                    <Check className="h-4 w-4" />
                    {t("howItWorks.getStarted")}
                  </Button>
                </DialogClose>
              ) : (
                <Button
                  size="sm"
                  className="font-semibold shadow-lg shadow-primary/30"
                  onClick={goNext}
                >
                  {t("howItWorks.next")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Decorative mock UI shown for each step. Hidden from the a11y tree — the
 *  heading + description carry the meaning. */
function StepVisualCard({ visual }: { visual: StepVisual }) {
  const { t } = useTranslation();

  if (visual === "market") {
    return (
      <div aria-hidden="true" className={VISUAL_CARD}>
        <div className="flex items-start gap-2.5">
          <span className="text-2xl leading-none">🌧️</span>
          <p className="text-sm font-semibold leading-snug">{t("howItWorks.demoQuestion")}</p>
        </div>
        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-b from-yes/15 to-yes/5 px-3 py-2 ring-1 ring-yes/20">
            <span className="text-xs font-bold text-yes">{t("market.yes")}</span>
            <span className="text-xs font-bold tabular-nums text-yes">64%</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-b from-no/15 to-no/5 px-3 py-2 ring-1 ring-no/20">
            <span className="text-xs font-bold text-no">{t("market.no")}</span>
            <span className="text-xs font-bold tabular-nums text-no">36%</span>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-yes to-yes/70 shadow-sm shadow-yes/40"
            style={{ width: "64%" }}
          />
        </div>
      </div>
    );
  }

  if (visual === "trade") {
    return (
      <div aria-hidden="true" className={VISUAL_CARD}>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-center rounded-xl bg-gradient-to-b from-yes to-yes/85 px-3 py-2.5 text-sm font-bold text-yes-foreground shadow-lg shadow-yes/30 ring-1 ring-yes/50">
            {t("market.yes")}
          </div>
          <div className="flex items-center justify-center rounded-xl bg-muted/60 px-3 py-2.5 text-sm font-bold text-muted-foreground ring-1 ring-border/50">
            {t("market.no")}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-background/60 px-3.5 py-3 ring-1 ring-border/60 backdrop-blur">
          <span className="text-xs text-muted-foreground">{t("market.amount")}</span>
          <span className="text-sm font-bold tabular-nums">K 5,000</span>
        </div>
        <div className="mt-3 flex items-center justify-center rounded-xl bg-gradient-to-b from-primary to-primary/85 px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30">
          {t("howItWorks.demoPlace")}
        </div>
      </div>
    );
  }

  return (
    <div aria-hidden="true" className={cn(VISUAL_CARD, "p-5 text-center")}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-300/30 to-amber-500/5 shadow-inner ring-1 ring-amber-400/30">
        <Trophy className="h-6 w-6 text-amber-400" />
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {t("howItWorks.demoReceive")}
      </p>
      <p className="mt-1 bg-gradient-to-r from-amber-200 via-amber-300 to-yes bg-clip-text text-3xl font-extrabold tabular-nums text-transparent">
        K 7,800
      </p>
      <div className="mt-4 flex items-center justify-center rounded-xl bg-gradient-to-b from-yes to-yes/85 px-3 py-2.5 text-sm font-semibold text-yes-foreground shadow-lg shadow-yes/30">
        {t("howItWorks.demoCollect")}
      </div>
    </div>
  );
}
