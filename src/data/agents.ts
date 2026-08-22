export type PaymentMethod = "KBZ Pay" | "Wave Pay" | "AYA Pay" | "CB Pay" | "Cash" | "Bank Transfer";

export type Agent = {
  id: string;
  name: string;
  initials: string;
  avatarColor: string; // tailwind bg class
  isOnline: boolean;
  lastSeenAt?: string;
  avgProcessingSeconds?: number;
  completedTrades: number;
  completionRate: number;   // 0-100 %
  responseTime: string;     // formatted avg processing e.g. "~3 min"
  score: number;            // 0-100
  commissionRate: number;   // % e.g. 1.5
  limits: { min: number; max: number }; // Kyat
  paymentMethods: PaymentMethod[];
  supports: "both" | "buy" | "sell";
  verified: boolean;
};

export const AGENTS: Agent[] = [
  {
    id: "agent-001",
    name: "Ko Aung Kyaw",
    initials: "AK",
    avatarColor: "bg-blue-600",
    isOnline: true,
    completedTrades: 1842,
    completionRate: 99.1,
    responseTime: "~2 min",
    score: 97,
    commissionRate: 1.2,
    limits: { min: 5000, max: 5000000 },
    paymentMethods: ["KBZ Pay", "Wave Pay", "Bank Transfer"],
    supports: "both",
    verified: true,
  },
  {
    id: "agent-002",
    name: "Ma Thet Hnin",
    initials: "TH",
    avatarColor: "bg-purple-600",
    isOnline: true,
    completedTrades: 934,
    completionRate: 98.4,
    responseTime: "~5 min",
    score: 94,
    commissionRate: 1.5,
    limits: { min: 10000, max: 2000000 },
    paymentMethods: ["Wave Pay", "AYA Pay", "Cash"],
    supports: "both",
    verified: true,
  },
  {
    id: "agent-003",
    name: "U Zaw Min",
    initials: "ZM",
    avatarColor: "bg-emerald-600",
    isOnline: false,
    completedTrades: 3210,
    completionRate: 99.7,
    responseTime: "~10 min",
    score: 99,
    commissionRate: 1.0,
    limits: { min: 50000, max: 10000000 },
    paymentMethods: ["KBZ Pay", "CB Pay", "Bank Transfer"],
    supports: "both",
    verified: true,
  },
  {
    id: "agent-004",
    name: "Daw Khin Moe",
    initials: "KM",
    avatarColor: "bg-rose-600",
    isOnline: true,
    completedTrades: 521,
    completionRate: 96.8,
    responseTime: "~8 min",
    score: 88,
    commissionRate: 2.0,
    limits: { min: 5000, max: 500000 },
    paymentMethods: ["KBZ Pay", "Wave Pay"],
    supports: "buy",
    verified: false,
  },
  {
    id: "agent-005",
    name: "Ko Pyae Sone",
    initials: "PS",
    avatarColor: "bg-amber-600",
    isOnline: true,
    completedTrades: 267,
    completionRate: 95.2,
    responseTime: "~15 min",
    score: 82,
    commissionRate: 1.8,
    limits: { min: 10000, max: 1000000 },
    paymentMethods: ["Wave Pay", "Cash"],
    supports: "sell",
    verified: false,
  },
  {
    id: "agent-006",
    name: "Ma Su Su",
    initials: "SS",
    avatarColor: "bg-cyan-600",
    isOnline: true,
    completedTrades: 1128,
    completionRate: 97.9,
    responseTime: "~4 min",
    score: 93,
    commissionRate: 1.3,
    limits: { min: 20000, max: 3000000 },
    paymentMethods: ["KBZ Pay", "AYA Pay", "CB Pay"],
    supports: "both",
    verified: true,
  },
  {
    id: "agent-007",
    name: "Ko Kaung Htet",
    initials: "KH",
    avatarColor: "bg-indigo-600",
    isOnline: false,
    completedTrades: 88,
    completionRate: 92.0,
    responseTime: "~20 min",
    score: 74,
    commissionRate: 2.5,
    limits: { min: 5000, max: 200000 },
    paymentMethods: ["Cash", "Wave Pay"],
    supports: "both",
    verified: false,
  },
  {
    id: "agent-008",
    name: "Daw Aye Aye",
    initials: "AA",
    avatarColor: "bg-teal-600",
    isOnline: true,
    completedTrades: 2560,
    completionRate: 99.3,
    responseTime: "~3 min",
    score: 98,
    commissionRate: 1.1,
    limits: { min: 10000, max: 8000000 },
    paymentMethods: ["KBZ Pay", "Wave Pay", "AYA Pay", "Bank Transfer"],
    supports: "both",
    verified: true,
  },
];

export function getAgent(id: string): Agent | undefined {
  return AGENTS.find((a) => a.id === id);
}
