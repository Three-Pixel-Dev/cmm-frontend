import { create } from "zustand";
import { persist } from "zustand/middleware";

type BetModeState = {
  mode: "real" | "virtual";
  setMode: (mode: "real" | "virtual") => void;
};

export const useBetMode = create<BetModeState>()(
  persist(
    (set) => ({
      mode: "real",
      setMode: (mode) => set({ mode }),
    }),
    { name: "cmm-bet-mode" },
  ),
);
