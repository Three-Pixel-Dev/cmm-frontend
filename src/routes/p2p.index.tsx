import { useState, useMemo, useCallback } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ShieldCheck,
  SlidersHorizontal,
  UserPlus,
  Loader2,
  MessageCircle,
  LogIn,
} from "lucide-react";
import { useAuth } from "@/store/useAuth";
import { useChatUI } from "@/store/useChatUI";
import { useOpenWithAgent } from "@/hooks/useChat";
import { useProfileStatus } from "@/hooks/useProfile";
import type { Agent } from "@/data/agents";
import { p2pApi } from "@/lib/api/p2p";
import { mapMarketplaceAgent } from "@/lib/p2p/agents";
import { AgentCard } from "@/components/p2p/AgentCard";
import { P2POrderModal } from "@/components/p2p/OrderModal";
import { Button } from "@/components/ui/button";
import { fmtKyat } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/p2p/")({
  head: () => ({ meta: [{ title: "P2P — SuperCash" }] }),
  component: P2PPage,
});

type SortKey = "commission" | "completion" | "trades" | "score";

function P2PPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [modalOpen, setModalOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>("commission");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const user = useAuth((s) => s.user);
  const { needsSetup } = useProfileStatus();

  const promptLogin = useCallback(
    (messageKey: "p2p.loginToTrade" | "p2p.loginToChat" | "p2p.loginToViewOrders") => {
      toast.info(t(messageKey), {
        action: {
          label: t("nav.login"),
          onClick: () => navigate({ to: "/login", search: { redirect: "/p2p" } }),
        },
      });
    },
    [navigate, t],
  );

  const promptProfileSetup = useCallback(() => {
    toast.warning(t("settings.profileSetupTitle"), {
      description: t("settings.profileSetupDesc"),
      action: {
        label: t("settings.profileSetupCta"),
        onClick: () => navigate({ to: "/settings/profile" }),
      },
    });
  }, [navigate, t]);

  const agentsQ = useQuery({
    queryKey: ["p2p", "marketplace"],
    queryFn: () => p2pApi.listMarketplaceAgents({ limit: 100 }),
    enabled: isLoggedIn,
  });

  const ordersQ = useQuery({
    queryKey: ["p2p", "trade-requests", "me"],
    queryFn: () => p2pApi.listMyTradeRequests({ limit: 20 }),
    enabled: isLoggedIn,
  });

  const marketplaceAgents = useMemo(
    () =>
      (agentsQ.data?.items ?? [])
        .filter((api) => !user?.id || api.user_id !== user.id)
        .map(mapMarketplaceAgent),
    [agentsQ.data?.items, user?.id],
  );

  const agents = useMemo(() => {
    let list = marketplaceAgents;
    if (onlineOnly) list = list.filter((a) => a.isOnline);
    if (verifiedOnly) list = list.filter((a) => a.verified);
    return [...list].sort((a, b) => {
      if (sort === "commission") return a.commissionRate - b.commissionRate;
      if (sort === "completion") return b.completionRate - a.completionRate;
      if (sort === "trades") return b.completedTrades - a.completedTrades;
      return b.score - a.score;
    });
  }, [marketplaceAgents, sort, onlineOnly, verifiedOnly]);

  const openWithAgent = useOpenWithAgent();
  const openChatPanel = useChatUI((s) => s.openPanel);
  const startChat = (p2pId: string) =>
    openWithAgent.mutate(p2pId, { onSuccess: (conv) => openChatPanel(conv.id) });

  const handleBuy = (agent: Agent) => {
    if (!isLoggedIn) {
      promptLogin("p2p.loginToTrade");
      return;
    }
    if (needsSetup) {
      promptProfileSetup();
      return;
    }
    setSelectedAgent(agent);
    setOrderType("buy");
    setModalOpen(true);
  };
  const handleSell = (agent: Agent) => {
    if (!isLoggedIn) {
      promptLogin("p2p.loginToTrade");
      return;
    }
    if (needsSetup) {
      promptProfileSetup();
      return;
    }
    setSelectedAgent(agent);
    setOrderType("sell");
    setModalOpen(true);
  };
  const handleChat = (agent: Agent) => {
    if (!isLoggedIn) {
      promptLogin("p2p.loginToChat");
      return;
    }
    if (needsSetup) {
      promptProfileSetup();
      return;
    }
    startChat(agent.id);
  };
  const handleOrderChat = (p2pId: string) => {
    if (needsSetup) {
      promptProfileSetup();
      return;
    }
    startChat(p2pId);
  };
  const recentOrders = ordersQ.data?.items?.slice(0, 5) ?? [];

  const sortLabels: Record<SortKey, string> = {
    commission: t("p2p.lowestFee"),
    completion: t("p2p.completion"),
    trades: t("p2p.mostTrades"),
    score: t("p2p.topScore"),
  };

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <span className="text-2xl">🤝</span> {t("p2p.title")}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t("p2p.subtitle")}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto">
          {isLoggedIn && (
            <>
              <div className="grid grid-cols-3 gap-2 text-xs sm:flex sm:gap-3">
                <StatBox
                  value={String(marketplaceAgents.filter((a) => a.isOnline).length)}
                  label={t("p2p.onlineNow")}
                  cls="text-yes"
                />
                <StatBox value={String(marketplaceAgents.length)} label={t("p2p.agents")} />
                <StatBox
                  value={marketplaceAgents
                    .reduce((s, a) => s + a.completedTrades, 0)
                    .toLocaleString()}
                  label={t("p2p.totalTrades")}
                  cls="text-primary"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 font-semibold sm:w-auto"
                asChild
              >
                <Link to="/p2p/apply">
                  <UserPlus className="h-4 w-4" />
                  {t("p2p.becomeAgent")}
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* How P2P works */}
      <div className="rounded-2xl border border-border/60 bg-card px-5 py-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          {t("p2p.howItWorks")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3 text-sm">
          {(
            [
              { icon: "🔍", step: "01", titleKey: "p2p.step1Title", descKey: "p2p.step1Desc" },
              { icon: "💬", step: "02", titleKey: "p2p.step2Title", descKey: "p2p.step2Desc" },
              { icon: "✅", step: "03", titleKey: "p2p.step3Title", descKey: "p2p.step3Desc" },
            ] as const
          ).map(({ icon, step, titleKey, descKey }) => (
            <div key={step} className="flex gap-3 items-start">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
                {icon}
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-widest text-muted-foreground/50">
                  STEP {step}
                </div>
                <div className="font-semibold text-sm">{t(titleKey)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t(descKey)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isLoggedIn ? (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3 items-start">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <LogIn className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{t("p2p.loginToTrade")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("p2p.loginToTradeDesc")}</p>
            </div>
          </div>
          <Button asChild className="shrink-0 w-full sm:w-auto">
            <Link to="/login" search={{ redirect: "/p2p" }}>
              {t("nav.login")}
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {(Object.keys(sortLabels) as SortKey[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSort(s)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium border transition-all",
                        sort === s
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {sortLabels[s]}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <FilterBtn
                    active={onlineOnly}
                    onClick={() => setOnlineOnly(!onlineOnly)}
                    cls="border-yes bg-yes/10 text-yes"
                  >
                    ● {t("p2p.onlineOnly")}
                  </FilterBtn>
                  <FilterBtn
                    active={verifiedOnly}
                    onClick={() => setVerifiedOnly(!verifiedOnly)}
                    cls="border-blue-400 bg-blue-500/10 text-blue-400"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    {t("p2p.verified")}
                  </FilterBtn>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                {agents.length} {t("p2p.agentsAvailable")}
              </div>

              {agentsQ.isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : agentsQ.isError ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  {t("p2p.agentsLoadError")}
                </p>
              ) : agents.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No P2P agents available yet.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {agents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      isLoggedIn={isLoggedIn}
                      onBuy={handleBuy}
                      onSell={handleSell}
                      onChat={handleChat}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="order-2 space-y-4 lg:order-none">
              <div className="rounded-xl border border-border/60 bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">{t("p2p.myOrders")}</h3>
                {!isLoggedIn ? (
                  <div className="py-8 text-center space-y-3">
                    <p className="text-xs text-muted-foreground">{t("p2p.loginToViewOrders")}</p>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/login" search={{ redirect: "/p2p" }}>
                        {t("nav.login")}
                      </Link>
                    </Button>
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    {t("p2p.noOrders")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentOrders.map((o) => (
                      <div
                        key={o.id}
                        className="flex items-center gap-2 rounded-lg bg-elevated/60 px-3 py-2.5 text-xs"
                      >
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-bold uppercase text-[10px]",
                            o.type === "buy" ? "bg-yes/15 text-yes" : "bg-no/15 text-no",
                          )}
                        >
                          {o.type === "buy" ? t("p2p.buyTab") : t("p2p.sellTab")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{o.payment_method.type.name}</div>
                          <div className="text-muted-foreground capitalize">{o.status}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className={cn(
                              "font-bold tabular-nums",
                              o.type === "buy" ? "text-yes" : "text-no",
                            )}
                          >
                            {o.type === "buy" ? "+" : "-"}
                            {fmtKyat(Number(o.amount) - Number(o.commission))}
                          </div>
                          <div
                            className={cn(
                              "text-[10px] font-bold uppercase",
                              o.status === "completed"
                                ? "text-yes"
                                : o.status === "pending"
                                  ? "text-amber-400"
                                  : "text-muted-foreground",
                            )}
                          >
                            {o.status}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOrderChat(o.p2p_id)}
                          aria-label="Message agent about this order"
                          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2.5 text-xs text-muted-foreground">
                <h4 className="text-xs font-semibold text-foreground">{t("p2p.agentInfo")}</h4>
                <p className="flex gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                  {t("p2p.verified")} — identity verified agents.
                </p>
                <p className="flex gap-2">
                  <span className="text-yes shrink-0">●</span> {t("p2p.online")} = responsive now
                  (seen within 15 min).
                </p>
                <p className="flex gap-2">
                  <span className="shrink-0">○</span> {t("p2p.offline")} shows last seen time when
                  the agent portal was idle.
                </p>
                <p className="flex gap-2">
                  <span className="shrink-0">⏱</span> {t("p2p.responseTime")} = avg. order
                  processing time for completed trades.
                </p>
                <p className="flex gap-2">
                  <span className="shrink-0">⭐</span> {t("p2p.score")} = based on trades, disputes
                  & ratings.
                </p>
              </div>
            </aside>
          </div>

          <P2POrderModal
            agent={selectedAgent}
            type={orderType}
            open={modalOpen}
            onClose={() => setModalOpen(false)}
          />
        </>
      )}
    </main>
  );
}

function StatBox({ value, label, cls }: { value: string; label: string; cls?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-2 text-center sm:px-4">
      <div className={cn("text-base font-bold tabular-nums sm:text-lg", cls)}>{value}</div>
      <div className="text-[10px] text-muted-foreground sm:text-xs">{label}</div>
    </div>
  );
}
function FilterBtn({
  active,
  onClick,
  cls,
  children,
}: {
  active: boolean;
  onClick: () => void;
  cls: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium border transition-all flex items-center gap-1",
        active ? cls : "border-border text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
