import { useTranslation } from "react-i18next";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Agent } from "@/data/agents";
import { fmtKyat } from "@/lib/format";
import { formatRelativePast } from "@/lib/p2p/agents";
import { cn } from "@/lib/utils";

function ScoreBar({ score }: { score: number }) {
  const color = score >= 95 ? "bg-yes" : score >= 80 ? "bg-amber-400" : "bg-no";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 rounded-full bg-elevated overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs tabular-nums font-semibold">{score}</span>
    </div>
  );
}

export function AgentCard({ agent, onBuy, onSell, onChat, isLoggedIn = true }: {
  agent: Agent;
  onBuy: (agent: Agent) => void;
  onSell: (agent: Agent) => void;
  onChat?: (agent: Agent) => void;
  isLoggedIn?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border bg-card p-4 transition-all hover:border-primary/30">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative shrink-0">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white", agent.avatarColor)}>
            {agent.initials}
          </div>
          <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
            agent.isOnline ? "bg-yes" : "bg-muted")} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold truncate">{agent.name}</span>
            {agent.verified && <ShieldCheck className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
          </div>
          <div className="flex flex-col gap-0.5 mt-0.5 sm:flex-row sm:items-center sm:gap-2">
            <span className={cn("text-[10px] font-medium", agent.isOnline ? "text-yes" : "text-muted-foreground")}>
              {agent.isOnline ? `● ${t("p2p.online")}` : `○ ${t("p2p.offline")}`}
            </span>
            {!agent.isOnline && agent.lastSeenAt && (
              <span className="text-[10px] text-muted-foreground">
                {t("p2p.lastSeen", { time: formatRelativePast(agent.lastSeenAt) })}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">
              ⏱{" "}
              {agent.responseTime === "—"
                ? t("p2p.noProcessingData")
                : t("p2p.avgProcessing", { time: agent.responseTime })}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-base font-bold">{agent.commissionRate}%</div>
          <div className="text-[10px] text-muted-foreground">{t("p2p.commission")}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Stat label={t("p2p.trades")} value={agent.completedTrades.toLocaleString()} />
        <Stat label={t("p2p.complete")} value={`${agent.completionRate}%`}
          valueClass={agent.completionRate >= 98 ? "text-yes" : agent.completionRate >= 95 ? "text-amber-400" : "text-no"} />
        <div className="rounded-lg bg-elevated/60 px-2 py-1.5">
          <div className="text-[10px] text-muted-foreground mb-1">{t("p2p.score")}</div>
          <ScoreBar score={agent.score} />
        </div>
      </div>

      {/* Limit */}
      <div className="mb-3 flex flex-col gap-0.5 rounded-lg bg-elevated/40 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">{t("p2p.limit")}</span>
        <span className="font-semibold tabular-nums">{fmtKyat(agent.limits.min)} – {fmtKyat(agent.limits.max)}</span>
      </div>

      {/* Payment methods */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {agent.paymentMethods.map((m) => (
          <span key={m} className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{m}</span>
        ))}
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm"
          disabled={agent.supports !== "both" && agent.supports !== "buy"}
          onClick={() => onBuy(agent)}
          className="bg-yes text-yes-foreground hover:bg-yes/90 font-semibold text-xs">
          {t("p2p.buyTab")}
        </Button>
        <Button size="sm" variant="outline"
          disabled={agent.supports !== "both" && agent.supports !== "sell"}
          onClick={() => onSell(agent)}
          className="border-no/40 text-no hover:bg-no/10 font-semibold text-xs">
          {t("p2p.sellTab")}
        </Button>
      </div>
      {onChat && (
        <Button size="sm" variant="ghost"
          onClick={() => onChat(agent)}
          className="mt-2 w-full gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
          <MessageCircle className="h-3.5 w-3.5" /> {t("p2p.message", "Message agent")}
        </Button>
      )}
      {!isLoggedIn && (
        <p className="mt-2 text-center text-[10px] font-medium text-muted-foreground">
          {t("p2p.signInToTrade")}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-lg bg-elevated/60 px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
      <div className={cn("text-sm font-bold tabular-nums", valueClass)}>{value}</div>
    </div>
  );
}
