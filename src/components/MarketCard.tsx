import { useNavigate, useHydrated } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, Share2, Trophy, XCircle } from "lucide-react";
import { useState } from "react";
import type { MarketGroupCard, MarketItemRow } from "@/lib/markets/types";
import { isClosingSoon, timeRemaining } from "@/data/markets";
import { usePortfolio } from "@/store/usePortfolio";
import { useAuth } from "@/store/useAuth";
import { fmtCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ShareMarketDialog } from "@/components/market/ShareMarketDialog";
import { Badge } from "@/components/ui/badge";
import borkenImage from "@/assets/broken-image.jpg";
import {
  getItemAnswerOptions,
  optionTitle,
  winningOptionLabel,
} from "@/lib/markets/marketItemOptions";
import { leadingOptionPercent, optionImpliedPercent } from "@/lib/markets/optionPricing";

const MAX_ROWS = 4;

type ItemTerminalKind = "open" | "settled-yes" | "settled-no" | "settled-winner" | "cancelled" | "voided" | "expired";

function getItemTerminalKind(item: MarketItemRow): ItemTerminalKind {
  if (item.status === "settled") {
    if (item.winning_option_id) return "settled-winner";
    if (item.resolvedOutcome === "yes") return "settled-yes";
    if (item.resolvedOutcome === "no") return "settled-no";
    return item.yesPrice >= 0.5 ? "settled-yes" : "settled-no";
  }
  if (item.status === "cancelled") return "cancelled";
  if (item.status === "voided") return "voided";
  if (new Date(item.endDate) < new Date()) return "expired";
  return "open";
}

function groupClosingSoon(group: MarketGroupCard): boolean {
  return group.items.some(
    (item) => getItemTerminalKind(item) === "open" && isClosingSoon(itemAsMarket(item, group)),
  );
}

function groupResolutionSummary(group: MarketGroupCard) {
  const kinds = group.items.map(getItemTerminalKind);
  const openItems = group.items.filter((item) => getItemTerminalKind(item) === "open");
  const resolvedCount = group.items.length - openItems.length;

  return {
    allResolved: openItems.length === 0 && group.items.length > 0,
    partialResolved: resolvedCount > 0 && openItems.length > 0,
    resolvedCount,
    openItems,
    total: group.items.length,
  };
}

function itemAsMarket(item: MarketItemRow, group: MarketGroupCard) {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    endDate: item.endDate,
    yesPrice: item.yesPrice,
    resolvedOutcome: item.resolvedOutcome,
    status: item.status,
    category: group.categorySlug,
    description: group.description,
    icon: group.icon,
    volume: item.volume,
    liquidity: item.volume,
    participants: 0,
    history: [],
  };
}

function OutcomeBadge({
  kind,
  winnerLabel,
  t,
}: {
  kind: Exclude<ItemTerminalKind, "open">;
  winnerLabel?: string | null;
  t: (key: string) => string;
}) {
  if (kind === "settled-winner" && winnerLabel) {
    return (
      <span
        role="status"
        aria-label={winnerLabel}
        className="inline-flex shrink-0 max-w-[10rem] items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"
      >
        <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden />
        <span className="truncate" aria-hidden>
          {winnerLabel}
        </span>
      </span>
    );
  }

  if (kind === "settled-yes") {
    return (
      <span
        role="status"
        aria-label={t("market.resolvedYes")}
        className="inline-flex shrink-0 items-center gap-1 rounded-md bg-yes/15 px-2 py-0.5 text-xs font-semibold text-yes"
      >
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        <span aria-hidden>{t("market.yes")}</span>
      </span>
    );
  }

  if (kind === "settled-no") {
    return (
      <span
        role="status"
        aria-label={t("market.resolvedNo")}
        className="inline-flex shrink-0 items-center gap-1 rounded-md bg-no/15 px-2 py-0.5 text-xs font-semibold text-no"
      >
        <XCircle className="h-3 w-3" aria-hidden />
        <span aria-hidden>{t("market.no")}</span>
      </span>
    );
  }

  const label =
    kind === "cancelled"
      ? t("market.cancelled")
      : kind === "voided"
        ? t("market.voided")
        : t("market.ended");

  return (
    <span
      role="status"
      aria-label={label}
      className="inline-flex shrink-0 items-center rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground"
    >
      {label}
    </span>
  );
}

function ItemRow({
  item,
  group,
  lang,
}: {
  item: MarketItemRow;
  group: MarketGroupCard;
  lang: "en" | "my";
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const overridePrice = usePortfolio((s) => s.prices[item.id]);
  const answerOptions = getItemAnswerOptions(
    { ...item, real_pool: item.real_pool ?? null, virtual_pool: null },
    "real",
    lang,
  );
  const leading = leadingOptionPercent(answerOptions, item.real_pool ?? null);
  const yesPct = Math.round(
    overridePrice != null ? overridePrice * 100 : (leading?.pct ?? item.yesPrice * 100),
  );
  const terminalKind = getItemTerminalKind(item);
  const resolved = terminalKind !== "open";
  const winnerLabel = winningOptionLabel(
    {
      options: item.options,
      winning_option_id: item.winning_option_id,
      outcome: item.outcome ?? null,
    },
    lang,
  );
  const isBinary = answerOptions.length === 2;
  const visibleOptions = isBinary ? answerOptions : answerOptions.slice(0, 2);

  const goDetail = (optionId?: string, side?: "yes" | "no") => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const search: any = {
      itemId: item.id,
    };
    if (optionId && !optionId.startsWith("legacy-")) search.optionId = optionId;
    if (side) search.side = side;

    navigate({
      to: "/markets/$marketId",
      params: { marketId: group.id },
      search,
    });
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 px-1 py-2 sm:flex-row sm:items-center sm:gap-2",
        resolved && "opacity-90",
      )}
    >
      <h4 className="min-w-0 flex-1 text-sm font-medium leading-snug">{item.title[lang]}</h4>
      {resolved ? (
        <OutcomeBadge kind={terminalKind} winnerLabel={winnerLabel} t={t} />
      ) : (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <span
            className="text-sm font-semibold tabular-nums text-muted-foreground"
            aria-label={
              leading && !isBinary
                ? `${leading.pct.toFixed(0)}% ${optionTitle(leading.option, lang)}`
                : `${yesPct}% ${t("market.chance")}`
            }
          >
            {leading && !isBinary
              ? `${optionTitle(leading.option, lang)} ${Math.round(leading.pct)}%`
              : `${yesPct}%`}
          </span>
          <div className="flex flex-wrap gap-1">
            {visibleOptions.map((opt, index) => {
              const pct = Math.round(
                optionImpliedPercent(opt, answerOptions, item.real_pool ?? null),
              );
              const binarySide = index === 0 ? "yes" : "no";
              const btnClass =
                isBinary && index === 0
                  ? "bg-yes/15 text-yes hover:bg-yes/25"
                  : isBinary && index === 1
                    ? "bg-no/15 text-no hover:bg-no/25"
                    : "bg-muted text-foreground hover:bg-muted/80";

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goDetail(opt.id, isBinary ? binarySide : undefined);
                  }}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring",
                    btnClass,
                  )}
                >
                  {isBinary ? t(index === 0 ? "market.yes" : "market.no") : optionTitle(opt, lang)}
                  {!isBinary && <span className="ml-1 tabular-nums opacity-80">{pct}%</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function MarketCard({ group }: { group: MarketGroupCard }) {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const lang = i18n.language as "en" | "my";
  const hydrated = useHydrated();
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const showAuth = hydrated && isLoggedIn;
  const [shareOpen, setShareOpen] = useState(false);
  const visibleItems = group.items.slice(0, MAX_ROWS);
  const extra = group.items.length - visibleItems.length;
  const resolution = groupResolutionSummary(group);
  const closingSoon = groupClosingSoon(group);
  const nextOpenItem = resolution.openItems[0];

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShareOpen(true);
  };

  const goDetail = () => {
    navigate({
      to: "/markets/$marketId",
      params: { marketId: group.id },
    });
  };

  const cardAriaLabel = resolution.allResolved
    ? `${group.title[lang]}, ${t("market.resolved")}`
    : resolution.partialResolved
      ? `${group.title[lang]}, ${t("market.resolvedPartial", {
          resolved: resolution.resolvedCount,
          total: resolution.total,
        })}`
      : group.title[lang];

  return (
    <article
      className={cn(
        "flex flex-col rounded-xl border bg-card p-4 cursor-pointer transition-all hover:border-primary/40",
        resolution.allResolved
          ? "border-blue-500/25 bg-card/80"
          : "border-border/60 hover:shadow-[0_8px_30px_-12px_var(--primary)]",
      )}
      onClick={goDetail}
      aria-label={cardAriaLabel}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-elevated text-xl">
          {group.pictureUrl ? (
            <img
              src={group.pictureUrl}
              alt=""
              onError={({ currentTarget }) => {
                currentTarget.onerror = null;
                currentTarget.src = borkenImage;
              }}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            group.icon
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start gap-2">
            <h3 className="flex-1 text-sm font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {group.title[lang]}
            </h3>
            <button
              type="button"
              onClick={handleShare}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t("market.share")}
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
          {resolution.allResolved && (
            <Badge
              variant="secondary"
              className="inline-flex items-center gap-1 border-blue-500/30 bg-blue-500/10 text-blue-400"
              aria-hidden
            >
              <Trophy className="h-3 w-3" />
              {t("market.resolved")}
            </Badge>
          )}
          {resolution.partialResolved && (
            <Badge variant="outline" className="text-muted-foreground" aria-hidden>
              {t("market.resolvedPartial", {
                resolved: resolution.resolvedCount,
                total: resolution.total,
              })}
            </Badge>
          )}
        </div>
      </div>

      <div className="divide-y divide-border/50 flex-1">
        {visibleItems.map((item) => (
          <ItemRow key={item.id} item={item} group={group} lang={lang} />
        ))}
        {extra > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("market.moreOutcomes", { count: extra })}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground pt-3 border-t border-border/40">
        {showAuth ? (
          <span className="tabular-nums">{fmtCompact(group.totalVolume)} Vol.</span>
        ) : (
          <span />
        )}
        <span className="flex items-center gap-1">
          {resolution.allResolved ? (
            <span
              className="inline-flex items-center gap-1 font-medium text-blue-400"
              role="status"
            >
              <Trophy className="h-3 w-3" aria-hidden />
              {t("market.resolved")}
            </span>
          ) : (
            <>
              {resolution.partialResolved && (
                <span className="mr-1 text-muted-foreground" role="status">
                  {t("market.resolvedPartial", {
                    resolved: resolution.resolvedCount,
                    total: resolution.total,
                  })}
                </span>
              )}
              {closingSoon && (
                <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-500 mr-1">
                  {t("market.closingSoon")}
                </span>
              )}
              {nextOpenItem && (
                <>
                  <Clock className="h-3 w-3" aria-hidden />
                  <span>{timeRemaining(itemAsMarket(nextOpenItem, group))}</span>
                </>
              )}
            </>
          )}
        </span>
      </div>

      <ShareMarketDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        marketId={group.id}
        title={group.title[lang]}
        description={group.description.en}
        affiliateRatePercent={group.affiliateRatePercent}
      />
    </article>
  );
}
