import {
  MARKET_VOLUME_HISTORY_KEY,
  MarketDetails,
  MarketItem,
  useMarketGroupDetail,
} from "@/hooks/useMarketGroupDetail";
import { usePlaceBet } from "@/hooks/usePlaceBet";
import { useProfileStatus } from "@/hooks/useProfile";
import { parseWalletAmount, useWallet } from "@/hooks/useWallet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/useAuth";
import { useBetMode } from "@/store/useBetMode";
import { useQueryClient } from "@tanstack/react-query";
import { useHydrated, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import borkenImage from "@/assets/broken-image.jpg";
import { fmtDate, fmtLedger, fmtShares, type LedgerKind } from "@/lib/format";
import { Clock, Share2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { ApiMarketPool } from "@/types/market-api";
import { poolPricingInfo } from "@/lib/markets/map";
import { wouldRecoverStakeForOption, projectBetProfitForOption } from "@/lib/markets/optionEligibility";
import { leadingOptionPercent, optionImpliedPercent, optionEffectiveShares, totalOptionEffectiveShares, activePoolMoney, realPoolMoney } from "@/lib/markets/optionPricing";
import { newBetIdempotencyKey } from "@/lib/api/betIdempotency";
import {
  buildPlaceBetPayload,
  getItemAnswerOptions,
  optionTitle,
  resolveInitialOptionId,
  winningOptionLabel,
  type ItemAnswerOption,
} from "@/lib/markets/marketItemOptions";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { applyMarketLiveSnapshotToCache } from "@/lib/markets/liveSnapshot";
import { ShareMarketDialog } from "@/components/market/ShareMarketDialog";
import { MarketGroupVolumeChart } from "@/components/market/MarketGroupVolumeChart";
import { MarketOptionPicker } from "@/components/market/MarketOptionPicker";
import { MarketOptionsOrderBook } from "@/components/market/MarketOptionsOrderBook";

type Props = {
  detail: MarketDetails;
  focusItemId?: string;
  initialSide?: "yes" | "no";
  initialOptionId?: string;
};

function itemTerminal(item: MarketItem): boolean {
  if (item.status === "settled" || item.status === "cancelled" || item.status === "voided")
    return true;
  return new Date(item.close_time) < new Date();
}

const calculateProfitRatio = (
  optionId: string,
  shares: number,
  options: ReturnType<typeof getItemAnswerOptions>,
  legacyPool: ApiMarketPool | null | undefined,
  oneSharePrice: number,
  feePercentage: number,
) => projectBetProfitForOption(optionId, shares, options, legacyPool, oneSharePrice, feePercentage);

function PoolStats({
  options,
  legacyPool,
  oneSharePrice,
  ledger,
  showPoolTotal,
  showParticipants = true,
  lang,
}: {
  options: ItemAnswerOption[];
  legacyPool: ApiMarketPool | null;
  oneSharePrice: number;
  ledger: LedgerKind;
  showPoolTotal?: boolean;
  showParticipants?: boolean;
  lang: "en" | "my";
}) {
  const { t } = useTranslation();
  const pricing = legacyPool ? poolPricingInfo(legacyPool) : null;
  const multi = options.length > 2;

  return (
    <div className="space-y-3 text-sm">
      {!multi && pricing && (
        <div className="flex justify-between gap-4 items-center">
          <span className="text-muted-foreground">{t("market.chance")}</span>
          <span className="font-semibold tabular-nums text-yes">
            {Math.round(optionImpliedPercent(options[0], options, legacyPool))}%
          </span>
        </div>
      )}
      <div
        className={cn(
          "gap-3 rounded-lg bg-elevated/50 p-3 text-xs",
          multi ? "space-y-2" : "grid grid-cols-2",
        )}
      >
        {options.map((option, index) => {
          const pct = optionImpliedPercent(option, options, legacyPool);
          const activeShares = optionEffectiveShares(option, options, legacyPool);
          return (
            <div
              key={option.id}
              className={cn(multi && "flex items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0")}
            >
              <div className="min-w-0">
                <p className="text-muted-foreground mb-0.5 line-clamp-1">
                  {optionTitle(option, lang)}
                </p>
                {showParticipants && (
                  <p className="tabular-nums font-medium">{fmtShares(activeShares)}</p>
                )}
              </div>
              <p
                className={cn(
                  "shrink-0 tabular-nums font-semibold",
                  index === 0 && options.length === 2 ? "text-yes" : index === 1 && options.length === 2 ? "text-no" : "text-foreground",
                )}
              >
                {pct.toFixed(1)}%
              </p>
            </div>
          );
        })}
      </div>
      {showPoolTotal && legacyPool && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t("market.poolTotal")}</span>
          <span className="tabular-nums text-foreground font-medium">
            {fmtLedger(activePoolMoney(options, legacyPool, oneSharePrice), ledger, { compact: true })}
          </span>
        </div>
      )}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{t("market.sharePrice")}</span>
        <span className="tabular-nums">{fmtLedger(oneSharePrice, ledger)}</span>
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
  ledger,
}: {
  item: MarketItem;
  groupIcon: string;
  selected: boolean;
  onSelect: () => void;
  lang: "en" | "my";
  ledger: LedgerKind;
}) {
  const { t } = useTranslation();
  const resolved = itemTerminal(item);
  const legacyPool = ledger === "real" ? item.real_pool : item.virtual_pool;
  const answerOptions = getItemAnswerOptions(item, ledger, lang);
  const winnerLabel = winningOptionLabel(item, lang);
  const leading = leadingOptionPercent(answerOptions, legacyPool);
  const isBinary = answerOptions.length === 2;
  const yesPct = leading?.pct ?? 50;
  const noPct = 100 - yesPct;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border px-3 py-3 transition-colors cursor-pointer sm:flex-row sm:items-center sm:gap-3",
        selected ? "border-primary/50 bg-primary/5" : "border-transparent hover:bg-accent/40",
        resolved && "opacity-75",
      )}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      role="button"
      tabIndex={0}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-lg shrink-0">{groupIcon}</span>
        <span className="min-w-0 flex-1 text-sm font-medium leading-snug">{item.title[lang]}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-muted-foreground sm:w-20 sm:text-right">
          {resolved && winnerLabel ? (
            <span className="text-primary line-clamp-2">{winnerLabel}</span>
          ) : resolved && item.outcome ? (
            <span className={item.outcome === "yes" ? "text-yes" : "text-no"}>
              {item.outcome === "yes" ? t("market.yes") : t("market.no")}
            </span>
          ) : leading ? (
            isBinary ? (
              `${yesPct.toFixed(0)}%`
            ) : (
              <span className="line-clamp-2 text-left sm:text-right">
                {optionTitle(leading.option, lang)} {leading.pct.toFixed(0)}%
              </span>
            )
          ) : (
            "—"
          )}
        </span>
      </div>
      {!resolved && answerOptions.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-1.5 sm:ml-auto" onClick={(e) => e.stopPropagation()}>
          {isBinary ? (
            <>
              <span className="rounded-md bg-yes/15 px-2.5 py-1 text-xs font-semibold text-yes tabular-nums">
                {optionTitle(answerOptions[0], lang)} {yesPct.toFixed(0)}%
              </span>
              <span className="rounded-md bg-no/15 px-2.5 py-1 text-xs font-semibold text-no tabular-nums">
                {optionTitle(answerOptions[1], lang)} {noPct.toFixed(0)}%
              </span>
            </>
          ) : (
            answerOptions.slice(0, 3).map((opt) => (
              <span
                key={opt.id}
                className="rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-foreground tabular-nums"
              >
                {optionTitle(opt, lang)} {optionImpliedPercent(opt, answerOptions, legacyPool).toFixed(0)}%
              </span>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export const MarketDetail = ({ detail: initialDetail, focusItemId, initialSide = "yes", initialOptionId }: Props) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as "en" | "my";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: polledDetail, dataUpdatedAt } = useMarketGroupDetail(initialDetail.id, { refetchInterval: 1_500 });
  const detail = polledDetail ?? initialDetail;

  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const user = useAuth((s) => s.user);
  const hydrated = useHydrated();

  const showAuth = hydrated && isLoggedIn;

  const { needsSetup: needsProfile } = useProfileStatus();
  const { data: wallet } = useWallet(user?.id);
  const betMode = useBetMode((s) => s.mode);
  const isVirtualMode = betMode === "virtual";
  const ledger: LedgerKind = isVirtualMode ? "virtual" : "real";

  const [selectedId, setSelectedId] = useState(focusItemId);
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [shares, setShares] = useState(1);
  const [shareOpen, setShareOpen] = useState(false);

  const placeBet = usePlaceBet(detail.id);

  const selectedItem = useMemo(
    () => detail.items.find((i) => i.id === selectedId) ?? detail.items[0],
    [detail.items, selectedId],
  );

  const answerOptions = useMemo(
    () => (selectedItem ? getItemAnswerOptions(selectedItem, ledger, lang) : []),
    [selectedItem, ledger, lang],
  );

  const activeOptionId = selectedOptionId || answerOptions[0]?.id || "";

  useEffect(() => {
    if (!selectedItem) return;
    const opts = getItemAnswerOptions(selectedItem, ledger, lang);
    setSelectedOptionId(resolveInitialOptionId(opts, initialSide, initialOptionId));
  }, [selectedItem?.id, ledger, lang, initialSide, initialOptionId]);

  const balance =
    parseWalletAmount(betMode === "real" ? wallet?.amount : wallet?.virtual_amount) || 0;
  const stake = shares > 0 ? shares * (selectedItem?.one_share_price ?? 0) : 0;
  const activePool = selectedItem
    ? betMode === "real"
      ? selectedItem.real_pool
      : selectedItem.virtual_pool
    : null;

  const profit = selectedItem
    ? calculateProfitRatio(
        activeOptionId,
        shares,
        answerOptions,
        activePool,
        selectedItem.one_share_price,
        selectedItem.platform_fee_percentage,
      )
    : { payout: 0, profit: 0, roi: 0 };

  const sideOvercrowded =
    shares >= 1 &&
    !!selectedItem &&
    activeOptionId &&
    !wouldRecoverStakeForOption(
      activeOptionId,
      shares,
      answerOptions,
      activePool,
      selectedItem.one_share_price,
      selectedItem.platform_fee_percentage,
    );

  const noProfitAtOdds =
    shares >= 1 &&
    !!selectedItem &&
    activeOptionId &&
    !sideOvercrowded &&
    profit.profit <= 0;

  const selectedOptionPct = Math.round(
    optionImpliedPercent(
      answerOptions.find((o) => o.id === activeOptionId) ?? answerOptions[0],
      answerOptions,
      activePool,
    ),
  );

  useEffect(() => {
    setSelectedId(focusItemId);
  }, [focusItemId]);

  const pool = selectedItem
    ? betMode === "real"
      ? selectedItem.real_pool
      : selectedItem.virtual_pool
    : null;
  const isBinaryAnswers = answerOptions.length === 2;
  const selectedAnswer = answerOptions.find((o) => o.id === activeOptionId);
  const totalActiveShares = totalOptionEffectiveShares(answerOptions, pool);

  const refreshVolumeHistory = () => {
    void queryClient.invalidateQueries({
      queryKey: [MARKET_VOLUME_HISTORY_KEY, detail.id],
      refetchType: "all",
    });
  };

  const handleShare = () => {
    setShareOpen(true);
  };

  if (!selectedItem) return null;

  const resolved = itemTerminal(selectedItem);
  const outcome = selectedItem.outcome;
  const winnerLabel = winningOptionLabel(selectedItem, lang);
  const canPlace =
    !resolved &&
    showAuth &&
    shares >= 1 &&
    stake <= balance &&
    !sideOvercrowded &&
    !noProfitAtOdds &&
    !!activeOptionId &&
    !placeBet.isPending;

  const placeBetPayload = (ledgerKind: "real" | "virtual") =>
    buildPlaceBetPayload(selectedItem.id, activeOptionId, shares, ledgerKind);

  const orderSuccessDescription = () => {
    const label = optionTitle(selectedAnswer, lang);
    return `${selectedItem.title[lang]} · ${label}`;
  };

  const handlePlace = () => {
    if (!showAuth) {
      toast.error(t("market.loginToBet"));
      return;
    }

    if (needsProfile) {
      toast.warning(t("settings.profileSetupTitle"), {
        description: t("settings.profileSetupDesc"),
      });
      navigate({ to: "/settings/profile" });
      return;
    }
    if (shares < 1) {
      toast.error(t("market.sharesMin"));
      return;
    }
    if (stake > balance) {
      toast.error(t("market.insufficientFunds"));
      return;
    }
    if (sideOvercrowded) {
      toast.error(t("market.sideOvercrowded"));
      return;
    }

    const idempotency_key = newBetIdempotencyKey();

    if (isVirtualMode) {
      placeBet.mutate({ ...placeBetPayload("virtual"), idempotency_key }, {
        onSuccess: (result) => {
          if (result.live) {
            applyMarketLiveSnapshotToCache(queryClient, result.live);
          }
          refreshVolumeHistory();
          toast.success(t("market.orderPlaced"), {
            description: orderSuccessDescription(),
          });
          setShares(1);
        },
        onError: (err) => {
          const msg = err.message.toLowerCase();
          if (msg.includes("insufficient")) {
            toast.error(t("market.insufficientFunds"));
          } else if (msg.includes("overcrowded") || msg.includes("recover stake") || msg.includes("option_id")) {
            toast.error(t("market.sideOvercrowded"));
          } else {
            toast.error(err.message);
          }
        },
      });
      return;
    }

    placeBet.mutate({ ...placeBetPayload("real"), idempotency_key }, {
      onSuccess: (result) => {
        if (result.live) {
          applyMarketLiveSnapshotToCache(queryClient, result.live);
        }
        refreshVolumeHistory();
        toast.success(t("market.orderPlaced"), {
          description: orderSuccessDescription(),
        });
        setShares(1);
      },
      onError: (err) => {
        const msg = err.message.toLowerCase();
        if (msg.includes("insufficient")) {
          toast.error(t("market.insufficientFunds"));
        } else if (msg.includes("overcrowded") || msg.includes("recover stake") || msg.includes("option_id")) {
          toast.error(t("market.sideOvercrowded"));
        } else {
          toast.error(err.message);
        }
      },
    });
  };

  const primaryEnd = detail.items.reduce(
    (latest, i) => (new Date(i.close_time) > new Date(latest) ? i.close_time : latest),
    detail.items[0].close_time,
  );

  const primaryResolution = detail.items.reduce(
    (latest, i) => (new Date(i.resolution_time) > new Date(latest) ? i.resolution_time : latest),
    detail.items[0].resolution_time,
  );

  return (
    <>
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="order-2 min-w-0 space-y-5 lg:order-1">
        {resolved && (outcome || winnerLabel) && (
          <div
            className={cn(
              "rounded-xl border px-4 py-3 flex items-center gap-3 font-semibold text-sm",
              outcome === "no"
                ? "border-no/40 bg-no/10 text-no"
                : outcome === "void"
                  ? "border-border bg-muted/40 text-muted-foreground"
                  : "border-yes/40 bg-yes/10 text-yes",
            )}
          >
            <span className="text-xl">{outcome === "no" ? "❌" : outcome === "void" ? "↩" : "✅"}</span>
            <div>
              <div className="text-xs uppercase tracking-widest opacity-70">
                {t("market.resolved")}
              </div>
              <div>
                {selectedItem.title[lang]}
                {winnerLabel ? ` — ${t("market.resolvedWinner", { answer: winnerLabel })}` : outcome === "yes" ? ` — ${t("market.resolvedYes")}` : outcome === "no" ? ` — ${t("market.resolvedNo")}` : ""}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-start gap-3 sm:gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-elevated text-3xl">
            {detail.pictureUrl ? (
              <img
                src={detail.pictureUrl}
                alt={detail.title.en}
                onError={({ currentTarget }) => {
                  currentTarget.onerror = null; // prevents loops
                  currentTarget.src = borkenImage;
                }}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              detail.icon
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">{detail.title[lang]}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {showAuth && (
                <span>
                  {fmtLedger(
                    realPoolMoney(
                      getItemAnswerOptions(selectedItem, betMode === "real" ? "real" : "virtual", lang),
                      betMode === "real" ? selectedItem.real_pool : selectedItem.virtual_pool,
                      selectedItem.one_share_price,
                    ),
                    ledger,
                    { compact: true },
                  )}{" "}
                  {t("market.volume")}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t("market.ends")} {fmtDate(primaryEnd, lang)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t("market.resolution")} {fmtDate(primaryResolution, lang)}
              </span>
              <span>{t("market.outcomesCount", { count: detail.items.length })}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleShare}
            aria-label={t("market.share")}
            className="shrink-0 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("market.share")}</span>
          </button>
        </div>

        <MarketGroupVolumeChart
          marketId={detail.id}
          items={detail.items}
          ledger={ledger}
          ledgerLabel={ledger}
          lang={lang}
          showVolume={showAuth}
          forceLiveAppendKey={dataUpdatedAt}
        />

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">{t("market.outcomes")}</h2>
          <div className="space-y-1">
            {detail.items.map((item) => (
              <OutcomeRow
                key={item.id}
                item={item}
                groupIcon={detail.icon}
                selected={item.id === selectedItem.id}
                onSelect={() => setSelectedId(item.id)}
                lang={lang}
                ledger={ledger}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <h2 className="text-sm font-semibold mb-1">{selectedItem.title[lang]}</h2>
          <p className="text-xs text-muted-foreground mb-3">{t("market.liquidity")}</p>
          <PoolStats
            options={answerOptions}
            legacyPool={pool ?? null}
            oneSharePrice={selectedItem.one_share_price}
            ledger={ledger}
            showPoolTotal={showAuth}
            showParticipants={showAuth}
            lang={lang}
          />
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold">{t("market.about")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            {detail.description[lang]}
          </p>
          {selectedItem.description[lang] && (
            <>
              <p className="text-xs font-medium text-foreground mb-1">{t("market.resolution")}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {selectedItem.description[lang]}
              </p>
            </>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">{t("market.orderBook")}</h2>
          <MarketOptionsOrderBook
            options={answerOptions}
            legacyPool={pool}
            lang={lang}
            showShareCounts={showAuth}
          />
        </div>
      </div>

      <aside
        id="bet-panel"
        className="order-1 w-full space-y-3 self-start lg:order-2 lg:sticky lg:top-20"
      >
        <p className="text-xs text-muted-foreground line-clamp-2 px-1">
          {selectedItem.title[lang]}
        </p>
        <div
          className={cn(
            "rounded-xl border border-border/60 bg-card p-4 shadow-lg",
            isVirtualMode && "border-primary/40 bg-primary/5",
          )}
        >
          {isVirtualMode && (
            <div className="mb-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Trophy className="h-4 w-4" aria-hidden />
                {t("market.virtualModeActive")}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t("market.virtualModeBettingDesc")}
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground mb-1">{t("market.selectAnswer")}</p>
          <MarketOptionPicker
            options={answerOptions}
            selectedId={activeOptionId}
            onSelect={setSelectedOptionId}
            legacyPool={pool}
            lang={lang}
            binaryStyle={isBinaryAnswers}
          />

          <label className="text-xs text-muted-foreground">{t("market.shares")}</label>
          <div className="relative mt-1 mb-2">
            <span className="absolute right-12 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
              {t("market.shares")}
            </span>
            <Input
              type="number"
              value={shares === 0 ? "" : shares}
              onChange={(e) => setShares(e.target.value ? parseInt(e.target.value) : 0)}
              className="h-12 text-lg font-semibold tabular-nums bg-elevated"
            />
          </div>

          <div className="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
            {[1, 5, 10, 50].map((mult) => {
              const v = selectedItem.one_share_price * mult;
              return (
                <button
                  key={mult}
                  type="button"
                  onClick={() => setShares(mult)}
                  className="rounded-md border border-border bg-elevated py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground sm:flex-1"
                >
                  {mult === 1 ? fmtLedger(v, ledger) : fmtLedger(v, ledger, { compact: true })}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5 rounded-lg bg-elevated/60 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("market.shares")}</span>
              <span className="tabular-nums">{shares}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("market.amount")}</span>
              <span className="tabular-nums">{fmtLedger(shares * selectedItem.one_share_price, ledger)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-border/60 pt-1.5">
              <span>{t("market.profit")}</span>
              <span className={cn("tabular-nums", profit.profit >= 0 ? "text-yes" : "text-no")}>
                {profit.profit !== 0
                  ? `~${fmtLedger(profit.profit, ledger)}`
                  : fmtLedger(0, ledger)}
              </span>
            </div>
            <p className="pt-1 text-[10px] leading-relaxed text-muted-foreground">
              {t("market.profitDisclaimer")}
            </p>
          </div>

          {sideOvercrowded && (
            <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100 leading-relaxed">
              {t("market.sideOvercrowded")}
            </div>
          )}

          {noProfitAtOdds && (
            <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100 leading-relaxed">
              {t("market.noProfitAtCurrentOdds")}
            </div>
          )}

          {showAuth && (
            <div className="mt-2 rounded-lg bg-elevated/40 px-3 py-2 text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>{t("market.poolTotal")}</span>
                <span className="font-medium text-foreground tabular-nums">
                  {fmtLedger(
                    pool
                      ? activePoolMoney(answerOptions, pool, selectedItem.one_share_price)
                      : 0,
                    ledger,
                    { compact: true },
                  )}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t("market.totalShares")}</span>
                <span className="font-medium text-foreground tabular-nums">
                  {totalActiveShares.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <Button
            onClick={handlePlace}
            disabled={resolved || !canPlace}
            className={cn(
              "mt-3 hidden h-12 w-full text-base font-semibold lg:flex",
              isBinaryAnswers && activeOptionId.includes("no")
                ? "bg-no hover:bg-no/90"
                : "bg-yes hover:bg-yes/90",
            )}
          >
            {resolved
              ? t("market.resolved")
              : placeBet.isPending
                ? t("market.placing")
                : !showAuth
                  ? t("market.loginToBet")
                  : isVirtualMode
                    ? t("market.placeVirtualOrder")
                    : t("market.placeOrder")}
          </Button>

          <p className="mt-2 text-center text-xs text-muted-foreground">
            {showAuth
              ? `${isVirtualMode ? t("wallet.playBalance") : t("market.balance")}: ${fmtLedger(balance, ledger)}`
              : t("market.loginToBet")}
          </p>
        </div>

        <p className="text-[10px] text-center text-muted-foreground px-2">
          {timeRemaining(selectedItem.close_time)}
        </p>
      </aside>
    </div>

    {!resolved && (
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{selectedItem.title[lang]}</p>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {optionTitle(selectedAnswer, lang)} · {selectedOptionPct}%
            </p>
          </div>
          <Button
            onClick={handlePlace}
            disabled={resolved || !canPlace}
            size="sm"
            className={cn(
              "h-10 shrink-0 px-4 font-semibold",
              isBinaryAnswers && activeOptionId.includes("no")
                ? "bg-no hover:bg-no/90"
                : "bg-yes hover:bg-yes/90",
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
        </div>
      </div>
    )}

    <ShareMarketDialog
      open={shareOpen}
      onOpenChange={setShareOpen}
      marketId={detail.id}
      title={detail.title[lang]}
      description={detail.description.en}
      affiliateRatePercent={detail.affiliateRatePercent}
    />
    </>
  );
};

function timeRemaining(closeTime: string): string {
  const end = new Date(closeTime).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days >= 1) return `${days}d left`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours >= 1) return `${hours}h left`;
  const mins = Math.floor(diff / (1000 * 60));
  return `${mins}m left`;
}
