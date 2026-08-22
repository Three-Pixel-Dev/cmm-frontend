import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Position = {
  id: string;
  marketId: string;
  marketTitleEn: string;
  marketTitleMy: string;
  side: "yes" | "no";
  shares: number;
  avgPrice: number;
  cost: number;
  createdAt: string;
};

export type HistoryEntry = {
  id: string;
  action: "buy" | "sell" | "deposit" | "withdraw";
  amount: number;
  date: string;
  // market trade fields (undefined for wallet transactions)
  marketId?: string;
  marketTitleEn?: string;
  marketTitleMy?: string;
  side?: "yes" | "no";
  shares?: number;
  price?: number;
};

type State = {
  balance: number;
  positions: Position[];
  history: HistoryEntry[];
  prices: Record<string, number>;
  placeOrder: (input: {
    marketId: string;
    marketTitleEn: string;
    marketTitleMy: string;
    side: "yes" | "no";
    price: number;
    amount: number;
  }) => { ok: boolean; reason?: string };
  sellPosition: (positionId: string, currentYesPrice: number) => void;
  deposit: (amount: number) => void;
  withdraw: (amount: number) => { ok: boolean; reason?: string };
  reset: () => void;
  setPrice: (marketId: string, price: number) => void;
};

const INITIAL_BALANCE = 1000;
export const PLATFORM_FEE = 0.02; // 2%

export const usePortfolio = create<State>()(
  persist(
    (set, get) => ({
      balance: INITIAL_BALANCE,
      positions: [],
      history: [],
      prices: {},
      setPrice: (marketId, price) => set((s) => ({ prices: { ...s.prices, [marketId]: price } })),
      placeOrder: ({ marketId, marketTitleEn, marketTitleMy, side, price, amount }) => {
        const state = get();
        if (amount <= 0) return { ok: false, reason: "invalid" };
        if (amount > state.balance) return { ok: false, reason: "insufficient" };
        const effectivePrice = side === "yes" ? price : 1 - price;
        const shares = amount / effectivePrice;
        const id = `${marketId}-${Date.now()}`;
        const pos: Position = {
          id,
          marketId,
          marketTitleEn,
          marketTitleMy,
          side,
          shares,
          avgPrice: effectivePrice,
          cost: amount,
          createdAt: new Date().toISOString(),
        };
        const hist: HistoryEntry = {
          id,
          marketId,
          marketTitleEn,
          marketTitleMy,
          side,
          action: "buy",
          shares,
          price: effectivePrice,
          amount,
          date: new Date().toISOString(),
        };
        // small price impact
        const impact = Math.min(0.04, amount / 50000);
        const newYes =
          side === "yes" ? Math.min(0.99, price + impact) : Math.max(0.01, price - impact);
        set({
          balance: state.balance - amount,
          positions: [pos, ...state.positions],
          history: [hist, ...state.history],
          prices: { ...state.prices, [marketId]: newYes },
        });
        return { ok: true };
      },
      sellPosition: (positionId, currentYesPrice) => {
        const state = get();
        const pos = state.positions.find((p) => p.id === positionId);
        if (!pos) return;
        const price = pos.side === "yes" ? currentYesPrice : 1 - currentYesPrice;
        const grossProceeds = pos.shares * price;
        const proceeds = grossProceeds * (1 - PLATFORM_FEE);
        const hist: HistoryEntry = {
          id: `${positionId}-sell-${Date.now()}`,
          marketId: pos.marketId,
          marketTitleEn: pos.marketTitleEn,
          marketTitleMy: pos.marketTitleMy,
          side: pos.side,
          action: "sell",
          shares: pos.shares,
          price,
          amount: proceeds,
          date: new Date().toISOString(),
        };
        set({
          balance: state.balance + proceeds,
          positions: state.positions.filter((p) => p.id !== positionId),
          history: [hist, ...state.history],
        });
      },
      deposit: (amount) => {
        const hist: HistoryEntry = {
          id: `deposit-${Date.now()}`,
          action: "deposit",
          amount,
          date: new Date().toISOString(),
        };
        set((s) => ({ balance: s.balance + amount, history: [hist, ...s.history] }));
      },
      withdraw: (amount) => {
        const state = get();
        if (amount > state.balance) return { ok: false, reason: "insufficient" };
        const hist: HistoryEntry = {
          id: `withdraw-${Date.now()}`,
          action: "withdraw",
          amount,
          date: new Date().toISOString(),
        };
        set((s) => ({ balance: s.balance - amount, history: [hist, ...s.history] }));
        return { ok: true };
      },
      reset: () => set({ balance: INITIAL_BALANCE, positions: [], history: [], prices: {} }),
    }),
    { name: "cmm-portfolio" },
  ),
);
