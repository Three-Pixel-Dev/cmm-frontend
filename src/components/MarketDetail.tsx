import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Share2, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MarketGroupDetail, MarketItemDetail } from "@/lib/markets/types";
import { poolPricingInfo } from "@/lib/markets/map";
import { applyMarketLiveSnapshotToCache } from "@/lib/markets/liveSnapshot";
import type { ApiMarketPool } from "@/types/market-api";
import { isResolved, getOutcome, timeRemaining } from "@/data/markets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/store/useAuth";
import { usePortfolio } from "@/store/usePortfolio";
import { useHydrated } from "@/hooks/useHydrated";
import { useWallet, parseWalletAmount } from "@/hooks/useWallet";
import { usePlaceBet } from "@/hooks/usePlaceBet";
import { newBetIdempotencyKey } from "@/lib/api/betIdempotency";
import { fmtKyat, fmtKyatCompact, fmtDate, fmtShares } from "@/lib/format";
import { cn } from "@/lib/utils";
import borkenImage from "@/assets/broken-image.jpg";

function itemTerminal(item: MarketItemDetail): boolean {
  if (item.status === "settled" || item.status === "cancelled" || item.status === "voided")
    return true;
  return new Date(item.endDate) < new Date();
}

function PoolStats({ pool, oneSharePrice }: { pool: ApiMarketPool | null; oneSharePrice: number }) {
  const { t } = useTranslation();
  if (!pool) {
    return <p className="text-sm text-muted-foreground">—</p>;
  }
  const pricing = poolPricingInfo(pool);
  const yesPct = pricing.yesPrice;

  return (
    <div className="space-y-3 text-sm">
      <div className="flex justify-between gap-4 items-center">
        <span className="text-muted-foreground">{t("market.chance")}</span>
        <span className="font-semibold tabular-nums text-yes">{Math.round(yesPct * 100)}%</span>
      </div>
      <div className="grid grid-cols-2 gap-3 rounded-lg bg-elevated/50 p-3 text-xs">
        <div>
          <p className="text-muted-foreground mb-1">{t("market.yesShares")}</p>
          <p className="tabular-nums font-medium">{fmtShares(pricing.effectiveYesShares)}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1">{t("market.noShares")}</p>
          <p className="tabular-nums font-medium">{fmtShares(pricing.effectiveNoShares)}</p>
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{t("market.poolTotal")}</span>
        <span className="tabular-nums text-foreground font-medium">
          {fmtKyatCompact(pool.total_pool)}
        </span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{t("market.sharePrice")}</span>
        <span className="tabular-nums">{fmtKyat(oneSharePrice)}</span>
      </div>
    </div>
  );
}

function OutcomeRow({
  item,
  groupIcon,
  selected,
  onSelect,
  lang,
}: {
  item: MarketItemDetail;
  groupIcon: string;
  selected: boolean;
  onSelect: () => void;
  lang: "en" | "my";
}) {
  const { t } = useTranslation();
  const yesPrice = item.yesPrice;
  const yesPct = Math.round(yesPrice * 100);
  const resolved = itemTerminal(item);
  const outcome = resolved
    ? getOutcome({
        ...item,
        yesPrice,
        category: "world",
        description: item.description,
        icon: groupIcon,
        liquidity: item.volume,
        participants: item.participants,
        history: [],
      })
    : null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-3 transition-colors cursor-pointer",
        selected ? "border-primary/50 bg-primary/5" : "border-transparent hover:bg-accent/40",
        resolved && "opacity-75",
      )}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      role="button"
      tabIndex={0}
    >
      <span className="text-lg shrink-0">{groupIcon}</span>
      <span className="flex-1 min-w-0 text-sm font-medium leading-snug">{item.title[lang]}</span>
      <span className="shrink-0 w-12 text-right text-sm font-semibold tabular-nums text-muted-foreground">
        {resolved && outcome ? (
          <span className={outcome === "yes" ? "text-yes" : "text-no"}>
            {outcome === "yes" ? t("market.yes") : t("market.no")}
          </span>
        ) : (
          `${yesPct}%`
        )}
      </span>
      {!resolved && (
        <div className="flex shrink-0 gap-1.5" onClick={(e) => e.stopPropagation()}>
          <span className="rounded-md bg-yes/15 px-2.5 py-1 text-xs font-semibold text-yes tabular-nums">
            {t("market.yes")} {yesPct}%
          </span>
          <span className="rounded-md bg-no/15 px-2.5 py-1 text-xs font-semibold text-no tabular-nums">
            {t("market.no")} {100 - yesPct}%
          </span>
        </div>
      )}
    </div>
  );
}

type Props = {
  detail: MarketGroupDetail;
  focusItemId?: string;
  initialSide?: "yes" | "no";
};

export function MarketDetail({ detail, focusItemId, initialSide = "yes" }: Props) {
  const { group, items } = detail;
  const { t, i18n } = useTranslation();
  const lang = i18n.language as "en" | "my";
  const queryClient = useQueryClient();

  const user = useAuth((s) => s.user);
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const hydrated = useHydrated();
  const showAuth = hydrated && isLoggedIn;

  const { data: wallet } = useWallet(showAuth ? user?.id : undefined);

  const placeBet = usePlaceBet();
  const [selectedId, setSelectedId] = useState(focusItemId);
  const [side, setSide] = useState<"yes" | "no">(initialSide);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    setSelectedId(focusItemId);
  }, [focusItemId]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? items[0],
    [items, selectedId],
  );

  const sharePrice = selected?.oneSharePrice ?? 5000;

  useEffect(() => {
    setAmount(String(sharePrice));
  }, [selected?.id, sharePrice]);

  const balance = parseWalletAmount(wallet?.amount);
  const yesPrice = selected ? selected.yesPrice : 0.5;
  const noPrice = 1 - yesPrice;
  const sidePrice = side === "yes" ? yesPrice : noPrice;
  const amt = parseFloat(amount) || 0;
  const shareCount = sharePrice > 0 ? Math.floor(amt / sharePrice) : 0;
  const stake = shareCount * sharePrice;
  /** Payout if the chosen side wins (stake × 1/price), minus stake. */
  const profit = sidePrice > 0 && stake > 0 ? stake / sidePrice - stake : 0;

  const chartData = useMemo(() => {
    const points = 24;
    const now = Date.now();
    const day = 86400000;
    return Array.from({ length: points }, (_, i) => ({
      t: now - (points - 1 - i) * (day / points),
      pct: Math.round(yesPrice * 100),
    }));
  }, [yesPrice]);

  if (!selected) return null;

  const resolved = itemTerminal(selected);
  const outcome = resolved
    ? getOutcome({
        ...selected,
        yesPrice,
        category: group.categorySlug,
        description: selected.description,
        icon: group.icon,
        liquidity: selected.volume,
        participants: selected.participants,
        history: [],
      })
    : null;

  const pool = selected.pool;
  const poolPricing = pool ? poolPricingInfo(pool) : null;
  const yesShares = poolPricing?.effectiveYesShares ?? 0;
  const noShares = poolPricing?.effectiveNoShares ?? 0;

  const canPlace =
    !resolved &&
    showAuth &&
    shareCount >= 1 &&
    stake > 0 &&
    stake <= balance &&
    !placeBet.isPending;

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: group.title[lang], url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => toast.success(t("market.copied")));
    }
  };

  const handlePlace = () => {
    if (!showAuth) {
      toast.error(t("market.loginToBet"));
      return;
    }
    if (shareCount < 1) {
      toast.error(t("market.sharesMin"));
      return;
    }
    if (stake > balance) {
      toast.error(t("market.insufficientFunds"));
      return;
    }

    placeBet.mutate(
      {
        market_item_id: selected.id,
        side,
        shares: shareCount,
        ledger: "real",
        idempotency_key: newBetIdempotencyKey(),
      },
      {
        onSuccess: (result) => {
          if (result.live) {
            applyMarketLiveSnapshotToCache(queryClient, result.live);
          }
          toast.success(t("market.orderPlaced"), {
            description: `${selected.title[lang]} · ${side === "yes" ? t("market.yes") : t("market.no")}`,
          });
          setAmount(String(sharePrice));
        },
        onError: (err) => {
          const msg = err.message.toLowerCase();
          if (msg.includes("insufficient")) {
            toast.error(t("market.insufficientFunds"));
          } else {
            toast.error(err.message);
          }
        },
      },
    );
  };

  const primaryEnd = items.reduce(
    (latest, i) => (new Date(i.endDate) > new Date(latest) ? i.endDate : latest),
    items[0].endDate,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-5 min-w-0">
        {resolved && outcome && (
          <div
            className={cn(
              "rounded-xl border px-4 py-3 flex items-center gap-3 font-semibold text-sm",
              outcome === "yes"
                ? "border-yes/40 bg-yes/10 text-yes"
                : "border-no/40 bg-no/10 text-no",
            )}
          >
            <span className="text-xl">{outcome === "yes" ? "✅" : "❌"}</span>
            <div>
              <div className="text-xs uppercase tracking-widest opacity-70">
                {t("market.resolved")}
              </div>
              <div>
                {selected.title[lang]} —{" "}
                {outcome === "yes" ? t("market.resolvedYes") : t("market.resolvedNo")}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-elevated text-3xl">
            {group.pictureUrl ? (
              <img
                src={group.pictureUrl}
                alt={group.title.en}
                onError={({ currentTarget }) => {
                  currentTarget.onerror = null; // prevents loops
                  currentTarget.src = borkenImage;
                }}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              group.icon
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">{group.title[lang]}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                {fmtKyatCompact(group.totalVolume)} {t("market.volume")}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t("market.ends")} {fmtDate(primaryEnd, lang)}
              </span>
              <span>{t("market.outcomesCount", { count: items.length })}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="shrink-0 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <Share2 className="h-3.5 w-3.5" />
            {t("market.share")}
          </button>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">{t("market.outcomes")}</h2>
          <div className="space-y-1">
            {items.map((item) => (
              <OutcomeRow
                key={item.id}
                item={item}
                groupIcon={group.icon}
                selected={item.id === selected.id}
                onSelect={() => setSelectedId(item.id)}
                lang={lang}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <h2 className="text-sm font-semibold mb-1">{selected.title[lang]}</h2>
          <p className="text-xs text-muted-foreground mb-3">{t("market.liquidity")}</p>
          <PoolStats pool={pool} oneSharePrice={selected.oneSharePrice} />
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">{t("market.probability")}</h2>
          <div className="h-48 w-full min-h-[12rem]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="yesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.18 155)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.72 0.18 155)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={36} fontSize={10} />
                <Tooltip formatter={(v) => [`${v}%`, t("market.yes")]} />
                <Area
                  type="monotone"
                  dataKey="pct"
                  stroke="oklch(0.72 0.18 155)"
                  fill="url(#yesGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold">{t("market.about")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            {group.description[lang]}
          </p>
          {selected.description[lang] && (
            <>
              <p className="text-xs font-medium text-foreground mb-1">{t("market.resolution")}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {selected.description[lang]}
              </p>
            </>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">{t("market.orderBook")}</h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="mb-2 flex justify-between text-muted-foreground">
                <span>{t("market.yes")}</span>
                <span>{t("market.shares")}</span>
              </div>
              <div className="relative flex justify-between rounded px-2 py-2 tabular-nums bg-yes/5">
                <span className="text-yes font-medium">{Math.round(yesPrice * 100)}%</span>
                <span>{fmtShares(yesShares)}</span>
              </div>
            </div>
            <div>
              <div className="mb-2 flex justify-between text-muted-foreground">
                <span>{t("market.no")}</span>
                <span>{t("market.shares")}</span>
              </div>
              <div className="relative flex justify-between rounded px-2 py-2 tabular-nums bg-no/5">
                <span className="text-no font-medium">{Math.round(noPrice * 100)}%</span>
                <span>{fmtShares(noShares)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="lg:sticky lg:top-20 self-start w-full space-y-3">
        <p className="text-xs text-muted-foreground line-clamp-2 px-1">{selected.title[lang]}</p>
        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-lg">
          <div className="my-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide("yes")}
              className={cn(
                "rounded-lg border py-3 text-center font-semibold transition-all",
                side === "yes"
                  ? "border-yes bg-yes/20 text-yes"
                  : "border-border bg-elevated text-muted-foreground",
              )}
            >
              <div className="text-xs uppercase opacity-80">{t("market.buyYes")}</div>
              <div className="text-lg tabular-nums">{Math.round(yesPrice * 100)}%</div>
            </button>
            <button
              type="button"
              onClick={() => setSide("no")}
              className={cn(
                "rounded-lg border py-3 text-center font-semibold transition-all",
                side === "no"
                  ? "border-no bg-no/20 text-no"
                  : "border-border bg-elevated text-muted-foreground",
              )}
            >
              <div className="text-xs uppercase opacity-80">{t("market.buyNo")}</div>
              <div className="text-lg tabular-nums">{Math.round(noPrice * 100)}%</div>
            </button>
          </div>

          <label className="text-xs text-muted-foreground">{t("market.amount")}</label>
          <div className="relative mt-1 mb-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
              K
            </span>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12 pl-7 text-lg font-semibold tabular-nums bg-elevated"
            />
          </div>

          <div className="mb-3 flex gap-1.5">
            {[1, 5, 10, 50].map((mult) => {
              const v = sharePrice * mult;
              return (
                <button
                  key={mult}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className="flex-1 rounded-md border border-border bg-elevated py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {mult === 1 ? fmtKyat(v) : fmtKyatCompact(v)}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5 rounded-lg bg-elevated/60 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("market.shares")}</span>
              <span className="tabular-nums">{shareCount}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-border/60 pt-1.5">
              <span>{t("market.profit")}</span>
              <span className="tabular-nums text-yes">
                {profit > 0 ? `+${fmtKyat(profit)}` : fmtKyat(0)}
              </span>
            </div>
          </div>

          <div className="mt-2 rounded-lg bg-elevated/40 px-3 py-2 text-xs space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>{t("market.poolTotal")}</span>
              <span className="font-medium text-foreground tabular-nums">
                {fmtKyatCompact(pool?.total_pool ?? 0)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{t("market.participants")}</span>
              <span className="font-medium text-foreground tabular-nums">
                {selected.participants.toLocaleString()}
              </span>
            </div>
          </div>

          <Button
            onClick={handlePlace}
            disabled={resolved || !canPlace}
            className={cn(
              "mt-3 w-full h-12 text-base font-semibold",
              side === "yes" ? "bg-yes hover:bg-yes/90" : "bg-no hover:bg-no/90",
            )}
          >
            {resolved
              ? t("market.resolved")
              : placeBet.isPending
                ? t("market.placing")
                : !showAuth
                  ? t("market.loginToBet")
                  : t("market.placeOrder")}
          </Button>

          <p className="mt-2 text-center text-xs text-muted-foreground">
            {showAuth ? `${t("market.balance")}: ${fmtKyat(balance)}` : t("market.loginToBet")}
          </p>
        </div>

        <p className="text-[10px] text-center text-muted-foreground px-2">
          {timeRemaining({
            id: selected.id,
            slug: selected.slug,
            title: selected.title,
            description: selected.description,
            category: group.categorySlug,
            icon: group.icon,
            yesPrice,
            volume: selected.volume,
            liquidity: selected.volume,
            endDate: selected.endDate,
            participants: selected.participants,
            history: [],
          })}
        </p>
      </aside>
    </div>
  );
}
