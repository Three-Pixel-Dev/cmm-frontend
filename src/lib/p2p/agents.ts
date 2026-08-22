import type { ApiMarketplaceP2P } from "@/lib/api/types";
import type { Agent } from "@/data/agents";

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-violet-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
];

export function formatAvgProcessingSeconds(seconds?: number | null): string {
  if (seconds == null || seconds <= 0) return "—";
  if (seconds < 3600) {
    const mins = Math.max(1, Math.round(seconds / 60));
    return `~${mins} min`;
  }
  const hrs = Math.max(1, Math.round(seconds / 3600));
  return `~${hrs} hr`;
}

export function formatRelativePast(iso: string, nowMs = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffSec = Math.max(0, Math.floor((nowMs - then) / 1000));
  if (diffSec < 60) return "just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} d ago`;
}

export function mapMarketplaceAgent(api: ApiMarketplaceP2P, index: number): Agent {
  const name = api.user_name?.trim() || "P2P Agent";
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    id: api.id,
    name,
    initials: initials || "PA",
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    isOnline: api.is_online ?? false,
    lastSeenAt: api.last_seen_at,
    avgProcessingSeconds: api.avg_processing_seconds,
    completedTrades: api.trade_count,
    completionRate: Number(api.complete_percentage) || 0,
    responseTime: formatAvgProcessingSeconds(api.avg_processing_seconds),
    score: Math.min(99, 75 + Math.min(api.trade_count, 24)),
    commissionRate: Number(api.commission_rate) || 0,
    limits: {
      min: Number(api.from_range) || 0,
      max: Number(api.to_range) || 0,
    },
    paymentMethods: [],
    supports: "both",
    verified: true,
  };
}
