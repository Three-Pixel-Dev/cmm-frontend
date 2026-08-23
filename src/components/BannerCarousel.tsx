import { useCallback, useEffect, useState } from "react";
import { useNavigate, useHydrated } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Sparkles, TrendingUp } from "lucide-react";
import type { MarketGroupCard, MarketItemRow } from "@/lib/markets/types";
import { usePortfolio } from "@/store/usePortfolio";
import { useAuth } from "@/store/useAuth";
import { fmtCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { BannerChanceChart } from "@/components/BannerChanceChart";

const MAX_OUTCOMES = 4;
const AUTOPLAY_MS = 6000;

function OutcomeRow({ item, lang }: { item: MarketItemRow; lang: "en" | "my" }) {
  const overridePrice = usePortfolio((s) => s.prices[item.id]);
  const yesPrice = overridePrice ?? item.yesPrice;
  const yesPct = Math.round(yesPrice * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 flex-1 truncate font-medium">{item.title[lang]}</span>
        <span className="shrink-0 tabular-nums font-semibold text-primary">{yesPct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${yesPct}%` }}
        />
      </div>
    </div>
  );
}

function BannerSlide({
  group,
  enabled,
  showVolume,
}: {
  group: MarketGroupCard;
  enabled: boolean;
  showVolume: boolean;
}) {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const lang = i18n.language as "en" | "my";

  const topOutcomes = [...group.items]
    .sort((a, b) => b.yesPrice - a.yesPrice)
    .slice(0, MAX_OUTCOMES);

  const goDetail = () => navigate({ to: "/markets/$marketId", params: { marketId: group.id } });

  return (
    <article
      onClick={goDetail}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goDetail();
        }
      }}
      aria-label={group.title[lang]}
      className={cn(
        "group relative grid cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-card",
        "min-h-[240px] md:grid-cols-[1.1fr_0.9fr]",
        "transition-all hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {/* themed glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"
      />

      {/* left: info + outcomes */}
      <div className="relative z-10 flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary">
            <Sparkles className="h-3 w-3" aria-hidden />
            {t("market.featured", "Featured")}
          </span>
          {showVolume && <span className="tabular-nums">{fmtCompact(group.totalVolume)} Vol.</span>}
        </div>

        <h2 className="text-xl font-bold leading-tight sm:text-2xl line-clamp-2">
          {group.title[lang]}
        </h2>

        <div className="mt-auto space-y-2.5">
          {topOutcomes.map((item) => (
            <OutcomeRow key={item.id} item={item} lang={lang} />
          ))}
        </div>
      </div>

      {/* right: chance chart (desktop) */}
      <div className="relative hidden overflow-hidden md:block">
        <BannerChanceChart
          marketId={group.id}
          items={group.items}
          lang={lang}
          enabled={enabled}
          className="h-full"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-card via-card/40 to-transparent"
        />
      </div>
    </article>
  );
}

export function BannerCarousel({ groups }: { groups: MarketGroupCard[] }) {
  const { t } = useTranslation();
  const hydrated = useHydrated();
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const showVolume = hydrated && isLoggedIn;
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setSelected(api.selectedScrollSnap());
    const onSelect = () => setSelected(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // Auto-advance, paused while the user hovers the banner.
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!api || paused || count <= 1) return;
    const id = setInterval(() => api.scrollNext(), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [api, paused, count]);

  const scrollTo = useCallback((i: number) => api?.scrollTo(i), [api]);

  if (groups.length === 0) return null;

  return (
    <section
      aria-label={t("market.featuredMarkets", "Featured markets")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h2 className="text-base font-bold">{t("market.featuredMarkets", "Featured markets")}</h2>
      </div>

      <Carousel opts={{ loop: groups.length > 1, align: "start" }} setApi={setApi}>
        <CarouselContent>
          {groups.map((g, i) => {
            const isActive = i === selected;
            const isNext = i === (selected + 1) % groups.length;
            const prefetch = isActive || isNext;
            return (
              <CarouselItem key={g.id}>
                <BannerSlide group={g} enabled={prefetch} showVolume={showVolume} />
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {groups.length > 1 && (
          <>
            <CarouselPrevious className="left-3 hidden sm:flex" />
            <CarouselNext className="right-3 hidden sm:flex" />
          </>
        )}
      </Carousel>

      {count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={t("market.goToSlide", "Go to slide {{n}}", { n: i + 1 })}
              aria-current={i === selected}
              onClick={() => scrollTo(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === selected
                  ? "w-6 bg-primary"
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
