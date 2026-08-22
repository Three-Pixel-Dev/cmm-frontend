import { create } from "zustand";
import { persist } from "zustand/middleware";

export type P2POrderType = "buy" | "sell"; // buy = user deposits, sell = user withdraws

export type P2POrderStatus = "pending" | "processing" | "completed" | "cancelled";

export type P2POrder = {
  id: string;
  agentId: string;
  agentName: string;
  type: P2POrderType;
  amount: number;         // Kyat user sends/receives
  commission: number;     // Kyat fee charged by agent
  netAmount: number;      // amount after commission
  paymentMethod: string;
  status: P2POrderStatus;
  date: string;
};

type State = {
  orders: P2POrder[];
  placeP2POrder: (input: {
    agentId: string;
    agentName: string;
    type: P2POrderType;
    amount: number;
    commission: number;
    paymentMethod: string;
    // balance update callback to keep stores separate
    applyBalance: (delta: number) => void;
  }) => P2POrder;
  cancelOrder: (orderId: string, refundBalance: (delta: number) => void) => void;
};

export const useP2P = create<State>()(
  persist(
    (set, get) => ({
      orders: [],

      placeP2POrder: ({ agentId, agentName, type, amount, commission, paymentMethod, applyBalance }) => {
        const netAmount = type === "buy"
          ? amount - commission          // user receives less after agent fee
          : amount - commission;         // user cashes out less after agent fee

        const order: P2POrder = {
          id: `p2p-${Date.now()}`,
          agentId,
          agentName,
          type,
          amount,
          commission,
          netAmount,
          paymentMethod,
          status: "processing",
          date: new Date().toISOString(),
        };

        // Simulate instant processing: balance updated immediately in demo
        if (type === "buy") {
          applyBalance(netAmount);   // credit balance (deposit)
        } else {
          applyBalance(-amount);     // debit balance (withdrawal)
        }

        // Simulate status change to "completed" after 1.5s in real app
        // For demo, mark completed immediately
        const completedOrder = { ...order, status: "completed" as P2POrderStatus };

        set((s) => ({ orders: [completedOrder, ...s.orders] }));
        return completedOrder;
      },

      cancelOrder: (orderId, refundBalance) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order || order.status === "completed") return;
        if (order.type === "buy") {
          refundBalance(-order.netAmount); // reverse credit
        } else {
          refundBalance(order.amount);     // reverse debit
        }
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === orderId ? { ...o, status: "cancelled" } : o
          ),
        }));
      },
    }),
    { name: "cmm-p2p" }
  )
);
